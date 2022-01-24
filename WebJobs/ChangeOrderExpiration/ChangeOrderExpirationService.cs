using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json.Linq;
using Phd.Jobs.Common;
using Pulte.Phd.Common.OAuth;
using Simple.OData.Client;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace ChangeOrderExpiration
{
    internal class ChangeOrderExpirationService : WebJobHostedService
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public ChangeOrderExpirationService(IConfiguration configuration, IHostApplicationLifetime applicationLifetime, IHttpClientFactory httpClientFactory)
            : base(applicationLifetime, configuration)
        {
            _httpClientFactory = httpClientFactory;
        }

        protected override string LeaseBlobName => "changeorderexpiration.txt";

        protected override async Task RunAsync()
        {
            try
            {
                var commExpDays = new Dictionary<int, int>();

                OAuthConfig oAuthConfig = new OAuthConfig();
                _configuration.GetSection("AzureAD").Bind(oAuthConfig);
                var tokenProvider = new OAuthTokenProvider(_httpClientFactory, oAuthConfig, _configuration["EDH:scope"]);
                var edhToken = await tokenProvider.GetTokenAsync();


                var edhClientSettings = new ODataClientSettings(new Uri(_configuration["EDH:ApiUrl"]));
                edhClientSettings.BeforeRequest = rq =>
                {
                    rq.Headers.Add("Authorization", $"Bearer {edhToken.AccessToken}");
                };

                var phdClientSettings = new ODataClientSettings(new Uri(_configuration["PhdApi:ApiUrl"]), new NetworkCredential(_configuration["phdSettings:user"], _configuration["phdSettings:password"]));
                phdClientSettings.BeforeRequest = rq =>
                {
                    rq.Headers.Add("Authorization", $"Basic {_configuration["PhdApi:ApiKey"]}");
                };

                var _edhclient = new ODataClient(edhClientSettings);
                var _phdclient = new ODataClient(phdClientSettings);

                using (HttpClient client = new HttpClient())
                {

                    client.DefaultRequestHeaders.TryAddWithoutValidation("Prefer", @"odata.include-annotations=""*""");
                    client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"Basic {_configuration["PhdApi:ApiKey"]}");
                    using (HttpResponseMessage changeOrderGroupsResponse = await client.GetAsync(_configuration["PhdApi:ApiUrl"] + "changeOrderGroups?$filter=salesStatusDescription eq 'OutforSignature'&$expand=job($select=id,financialCommunityId)"))
                    {
                        using (HttpContent changeOrderGroupsContent = changeOrderGroupsResponse.Content)
                        {
                            string changeOrderGroupsStringContent = await changeOrderGroupsContent.ReadAsStringAsync();
                            var changeOrderGroupsObject = JObject.Parse(changeOrderGroupsStringContent);
                            var changeOrderGroups = (JArray)changeOrderGroupsObject["value"];

                            int expirationDays = 0;

                            var batch = new ODataBatch(_edhclient);

                            foreach (var changeOrderGroup in changeOrderGroups)
                            {
                                int changeOrderGroupId = Convert.ToInt32((string)changeOrderGroup["id"]);
                                int communityId = Convert.ToInt32((string)changeOrderGroup["job"]["financialCommunityId"]);
                                DateTime changeOrderGroupSalesStatusDate = (DateTime)changeOrderGroup["salesStatusUTCDate"];

                                if (!commExpDays.ContainsKey(communityId))
                                {
                                    using (HttpResponseMessage signFieldResponse = await client.GetAsync(_configuration["PhdApi:ApiUrl"] + $"eSignFields({communityId})"))
                                    {
                                        using (HttpContent signFieldContent = signFieldResponse.Content)
                                        {
                                            //this shouldn't happen, but just in case...
                                            if (signFieldContent.Headers.ContentLength == 0)
                                            {
                                                continue;
                                            }

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

                                if (!await IsCOESigned(changeOrderGroupId, _phdclient))
                                {
                                    if (changeOrderGroupSalesStatusDate.AddDays(expirationDays) <= DateTime.Now)
                                    {
                                        await PatchCOGroup(changeOrderGroupId, _edhclient, batch);
                                    }
                                }
                            }

                            await batch.ExecuteAsync();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.Out.WriteLine(ex.Message, ex.StackTrace);
            }
        }

        static async Task<bool> IsCOESigned(int changeOrderGroupId, ODataClient client)
        {
            var envelope = await client.For("eSignEnvelopes")
                .Filter($"edhChangeOrderGroupId eq {changeOrderGroupId} and sentDate ne null and eSignStatusId ne 5")
                .FindEntryAsync();
            return envelope != null;
        }

        static async Task PatchCOGroup(int changeOrderGroupId, ODataClient client, ODataBatch batch)
        {
            var salesAgreement = await client.For<SalesAgreement>()
                .Filter($"jobChangeOrderGroupSalesAgreementAssocs/any(cog: cog/jobChangeOrderGroupId eq {changeOrderGroupId})")
                .FindEntryAsync();
            if (salesAgreement.Status == "OutforSignature" || salesAgreement.Status == "Approved")
            {
                var cog = new JobChangeOrderGroups
                {
                    Id = changeOrderGroupId,
                    SalesStatusDescription = "Pending",
                    LastModifiedBy = "changeorderexpiration",
                    LastModifiedUtcDate = DateTime.UtcNow
                };

                batch += c => c.For<JobChangeOrderGroups>()
                    .Key(changeOrderGroupId)
                    .Set(cog)
                    .UpdateEntryAsync();

                if (salesAgreement.Status == "OutforSignature")
                {
                    salesAgreement.Status = "Pending";
                    salesAgreement.StatusUtcDate = DateTime.UtcNow;
                    salesAgreement.LastModifiedBy = "changeorderexpiration";
                    salesAgreement.LastModifiedUtcDate = DateTime.UtcNow;

                    batch += s => s.For<SalesAgreement>()
                        .Key(salesAgreement.Id)
                        .Set(salesAgreement)
                        .UpdateEntryAsync();
                }
            }
        }
    }
}
