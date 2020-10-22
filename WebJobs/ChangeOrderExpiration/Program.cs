using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Azure.Storage.Blob;
using Microsoft.Azure.Storage;

namespace ChangeOrderExpiration
{
    class Program
    {
        static void Main(string[] args)
        {
            UpdateChangeOrderGroups().Wait();
        }

        private static async Task UpdateChangeOrderGroups()
        {
            IConfigurationRoot configuration;

            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json");

            configuration = builder.Build();

            var blobAccount = CloudStorageAccount.Parse(configuration["AzureDocumentStorage"]);
            var blobClient = blobAccount.CreateCloudBlobClient();
            var container = blobClient.GetContainerReference("web-jobs");
            var blob = container.GetBlockBlobReference("changeorderexpiration.txt");
            if (!await blob.ExistsAsync())
            {
                await blob.UploadTextAsync(DateTime.MinValue.ToString());
            }

            string leaseId = null;

            try
            {
                leaseId = await blob.AcquireLeaseAsync(new TimeSpan(0, 0, 60));
            }
            catch
            {
                return;
            }

            var previousDateTime = DateTime.Parse(await blob.DownloadTextAsync());
            if (previousDateTime > DateTime.Now.AddMinutes(-30))
            {
                await blob.ReleaseLeaseAsync(new AccessCondition { LeaseId = leaseId });
                return;
            }

            try
            {
                var commExpDays = new Dictionary<int, int>();

                using (HttpClient client = new HttpClient())
                {

                    client.DefaultRequestHeaders.TryAddWithoutValidation("Prefer", @"odata.include-annotations=""*""");
                    client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"Basic {configuration["PhdApi:ApiKey"]}");
                    using (HttpResponseMessage changeOrderGroupsResponse = await client.GetAsync(configuration["PhdApi:ApiUrl"] + "changeOrderGroups?$filter=salesStatusDescription eq 'OutforSignature'&$expand=job($select=id,financialCommunityId)"))
                    {
                        using (HttpContent changeOrderGroupsContent = changeOrderGroupsResponse.Content)
                        {
                            string changeOrderGroupsStringContent = await changeOrderGroupsContent.ReadAsStringAsync();
                            var changeOrderGroupsObject = JObject.Parse(changeOrderGroupsStringContent);
                            var changeOrderGroups = (JArray)changeOrderGroupsObject["value"];

                            int expirationDays = 0;

                            foreach (var changeOrderGroup in changeOrderGroups)
                            {
                                int changeOrderGroupId = Convert.ToInt32((string)changeOrderGroup["id"]);
                                int communityId = Convert.ToInt32((string)changeOrderGroup["job"]["financialCommunityId"]);
                                DateTime changeOrderGroupSalesStatusDate = (DateTime)changeOrderGroup["salesStatusUTCDate"];

                                if (!commExpDays.ContainsKey(communityId))
                                {
                                    using (HttpResponseMessage signFieldResponse = await client.GetAsync(configuration["PhdApi:ApiUrl"] + $"eSignFields({communityId})"))
                                    {
                                        using (HttpContent signFieldContent = signFieldResponse.Content)
                                        {
                                            string signFieldStringContent = await signFieldContent.ReadAsStringAsync();
                                            var signField = JObject.Parse(signFieldStringContent);
                                            expirationDays = Convert.ToInt32((string)signField["expirationDays"]);
                                        }
                                    }
                                    commExpDays.Add(communityId, expirationDays);
                                }
                                else
                                {
                                    expirationDays = commExpDays[communityId];
                                }
                                if (changeOrderGroupSalesStatusDate.AddDays(expirationDays) <= DateTime.Now)
                                {
                                    dynamic changeOrderGroupObject = new JObject();
                                    changeOrderGroupObject.id = changeOrderGroupId;
                                    changeOrderGroupObject.salesStatusDescription = "Pending";

                                    var str = JsonConvert.SerializeObject(changeOrderGroupObject);
                                    var changeOrderGroupContent = new StringContent(str, Encoding.UTF8, "application/json");

                                    await client.Patch(new System.Uri(configuration["PhdApi:ApiUrl"] + $"changeOrderGroups({changeOrderGroupId})"), changeOrderGroupContent);
                                }
                            }
                        }
                    }
                }

                await blob.UploadTextAsync(DateTime.Now.ToString(), null, new AccessCondition { LeaseId = leaseId }, null, null);
            }
            catch (Exception ex)
            {
                Console.Out.WriteLine(ex.Message, ex.StackTrace);
            }
            finally
            {
                await blob.ReleaseLeaseAsync(new AccessCondition { LeaseId = leaseId });
            }
        }
    }

    public static class HttpClientExtensions
    {
        public static async Task<HttpResponseMessage> Patch(this HttpClient client, Uri requestUri, HttpContent iContent)
        {
            var method = new HttpMethod("PATCH");
            var request = new HttpRequestMessage(method, requestUri)
            {
                Content = iContent
            };

            HttpResponseMessage response = new HttpResponseMessage();
            try
            {
                response = await client.SendAsync(request);
            }
            catch (TaskCanceledException e)
            {
                Console.WriteLine("ERROR: " + e.ToString());
            }

            return response;
        }
    }
}