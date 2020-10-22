using System;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using ODataHttpClient.Models;
using ODataHttpClient;

namespace AttributeCleanup
{
    public class EdhDeleteClient
    {
        private HttpClient Client { get; }
        private string ApiBaseUrl { get; }

        public EdhDeleteClient(HttpClient client, IConfigurationRoot configuration)
        {
            ApiBaseUrl = configuration["edhSettings:url"];

            client.BaseAddress = new Uri(ApiBaseUrl);
            client.DefaultRequestHeaders.Add("Prefer", @"odata.include-annotations=""*""");
            client.DefaultRequestHeaders.Add("Authorization", $"Basic {configuration["edhSettings:apiKey"]}");

            Client = client;
        }

        public async Task DeleteRecord(string url)
        {
            var oData = new ODataClient(Client);
            var batch = new BatchRequest($"{ApiBaseUrl}$batch")
            {
                Requests = new[]
                {
                    Request.Delete($"{ApiBaseUrl}{url}")
                }
            };

            var responses = await oData.BatchAsync(batch);
            foreach(var res in responses)
            {
                if(res.StatusCode != HttpStatusCode.OK || res.StatusCode != HttpStatusCode.NoContent)
                {
                    Console.Out.WriteLine($"Failed to delete, URL: {url}");
                }
            }
        }
    }
}
