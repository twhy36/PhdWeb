using System;
using Microsoft.Extensions.Configuration;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace LotRelease
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var host = new HostBuilder()
                .ConfigureHostConfiguration(hostConfig =>
                {
                    hostConfig.SetBasePath(Directory.GetCurrentDirectory());
                    hostConfig.AddCommandLine(args);
                })
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    config.SetBasePath(hostingContext.HostingEnvironment.ContentRootPath);
                    config.AddJsonFile("appsettings.json", true, true);
                })
                .ConfigureServices((hostingContext, services) =>
                {
                    services.AddHttpClient();
                    services.AddHostedService<LotReleaseService>();
                })
                .Build();
            try{
                await host.RunAsync();
            }catch (Exception ex){
                File.AppendAllText("error.log", ex.Message);
            }
        }
    }
}

