using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Phd.Jobs.Common
{
    public abstract class WebJobHostedService : IHostedService, IDisposable
    {
        private readonly IHostApplicationLifetime _applicationLifetime;
        protected readonly IConfiguration _configuration;

        private CancellationTokenSource _cts;
        private Task _currentTask;

        public WebJobHostedService(IHostApplicationLifetime applicationLifetime, IConfiguration configuration)
        {
            _applicationLifetime = applicationLifetime; 
            _configuration = configuration;
        }

        protected abstract Task RunAsync();
        protected abstract string LeaseBlobName { get; }

        private async Task GetLockAndRunAsync()
        {
            var blob = new BlobClient(_configuration["AzureDocumentStorage"], "web-jobs", LeaseBlobName);

            if (!await blob.ExistsAsync())
            {
                using var ms = new MemoryStream();
                using var writer = new StreamWriter(ms);
                writer.WriteLine(DateTime.MinValue.ToString());
                await writer.FlushAsync();
                ms.Position = 0;
                await blob.UploadAsync(ms);
            }

            var lease = new BlobLeaseClient(blob);

            try
            {
                await lease.AcquireAsync(new TimeSpan(0, 0, 60));
            }
            catch
            {
                _applicationLifetime.StopApplication();
                return;
            }

            using (var ms = new MemoryStream())
            {
                using var rdr = new StreamReader(ms);
                await blob.DownloadToAsync(ms);

                if (DateTime.TryParse(await rdr.ReadToEndAsync(), out DateTime previousDateTime) && previousDateTime > DateTime.Now.AddMinutes(-30))
                {
                    await lease.ReleaseAsync();

                    _applicationLifetime.StopApplication();
                    return;
                }
            }

            try
            {
                await RunAsync();

                using var ms = new MemoryStream();
                using var writer = new StreamWriter(ms);
                await writer.WriteAsync(DateTime.Now.ToString());
                await writer.FlushAsync();
                ms.Position = 0;
                await blob.UploadAsync(ms, conditions: new BlobRequestConditions { LeaseId = lease.LeaseId });
            }
            finally
            {
                await lease.ReleaseAsync();
                _applicationLifetime.StopApplication();
            }
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

            _currentTask = GetLockAndRunAsync();

            return _currentTask.IsCompleted ? _currentTask : Task.CompletedTask;
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            if (_currentTask == null)
            {
                return;
            }

            try
            {
                _cts.Cancel();
            }
            finally
            {
                await Task.WhenAny(_currentTask, Task.Delay(Timeout.Infinite, cancellationToken));
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
        }
    }
}
