using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Simple.OData.Client;
using System.Web;

namespace AttributeCleanup
{
    public class AttributeCommunityCleanup
    {
        private IConfigurationRoot _configuration { get; }

        public AttributeCommunityCleanup(IConfigurationRoot configuration)
        {
            _configuration = configuration;
        }

        public async Task Run()
        {
            try
            {
                // Get AttributeCommunity IDs not assoicated to an AttributeGroupCommunity ID
                List<int> unusedEdhAttrCommunityIds = await GetUnusedAttributeCommunities();

                // Get all the AttributeCommunity IDs used in PHD
                PhdClient phdClient = new PhdClient(_configuration);

                // [sales].[ScenarioChoiceAttribute]
                var taskPhdAttrCommunityIds = phdClient.GetIdsUsedInPhd("scenariochoiceattributes", "attributeCommunityId", unusedEdhAttrCommunityIds);
                // [sales].[ScenarioChoiceLocationAttribute]
                var taskLocationAttribute = phdClient.GetIdsUsedInLocationAttribute("attributeCommunityId", unusedEdhAttrCommunityIds);

                await Task.WhenAll(taskPhdAttrCommunityIds, taskLocationAttribute);

                var usedPhdAttrCommunityIds = taskPhdAttrCommunityIds.Result;
                var usedIdsLocationAttribute = taskLocationAttribute.Result;

                usedPhdAttrCommunityIds.AddRange(usedIdsLocationAttribute);

                // Remove unused AttributeCommunity IDs used in PHD
                List<int> attributeCommunityIdsToDelete = unusedEdhAttrCommunityIds.Except(usedPhdAttrCommunityIds).ToList();

                // Delete orphaned AttributeCommunity records
                await DeleteAttributeCommunities(attributeCommunityIdsToDelete);
            }
            catch (Exception ex)
            {
                Console.Out.WriteLine(ex.Message, ex.StackTrace);
            }
        }

        /// <summary>
        /// Get all AttributeCommunity IDs that are orphaned (no association with any AttributeGroupCommunity)
        /// </summary>
        /// <returns>List of AttributeCommunity IDs</returns>
        private async Task<List<int>> GetUnusedAttributeCommunities()
        {
            // Setup EDH client
            string filter = "not(AttributeGroupAttributeCommunityAssocs/any()) and not(jobchoiceattributes/any()) and not(jobplanoptionattributes/any()) " + 
                "and not(jobchangeorderplanoptionattributes/any()) and not(jobchangeorderchoiceattributes/ any()) and not(jobplanoptionlocationattributes/any()) " +
                "and not(jobchoicelocationattributes/any()) and not(jobchangeorderchoicelocationattributes/any())";
            string expand = "AttributeGroupAttributeCommunityAssocs,jobchoiceattributes,jobplanoptionattributes,jobchangeorderplanoptionattributes," +
                "jobchangeorderchoiceattributes,jobplanoptionlocationattributes,jobchoicelocationattributes,jobchangeorderchoicelocationattributes";
            string select = "id,createdBy";

            var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["edhSettings:apiKey"]}");
            };

            // Contact EDH to get orphaned AttributeCommunity IDs
            ODataClient edhClient = new ODataClient(edhClientSettings);
            var results = (await edhClient.For("AttributeCommunities")
                .Expand(expand)
                .Filter(filter)
                .Select(select)
                .FindEntriesAsync()).ToList();

            // Add IDs found to list
            List<int> unusedAttributeIds = new List<int>();
            foreach (var community in results)
            {
                if (!community["createdBy"].ToString().Contains("ssis_"))
                {
                    unusedAttributeIds.Add(Convert.ToInt32(community["id"]));
                }
            }

            return unusedAttributeIds;
        }

        /// <summary>
        /// Delete orphan records in AttributeCommunity table in EDH. For each record to be deleted,
        /// remove associated records in AttributeCommunityTag table in EDH.
        /// </summary>
        /// <param name="attributeCommunitiesToDelete">AttributeCommunity IDs to be deleted</param>
        /// <returns></returns>
        private async Task DeleteAttributeCommunities(List<int> attributeCommunitiesToDelete)
        {
            // Setup EDH Client
            var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["edhSettings:apiKey"]}");
            };
            ODataClient edhClient = new ODataClient(edhClientSettings);
            var batch = new ODataBatch(edhClient);

            foreach (int communityToDelete in attributeCommunitiesToDelete)
            {
                // Get all AttributeCommunityTags records for communityToDelete
                var results = (await edhClient.For("attributeCommunityTags")
                    .Filter($"attributeCommunityId eq {communityToDelete}")
                    .FindEntriesAsync()).ToList();

                // Delete all records found in AttributeCommunityTags for communityToDelete
                string apiVer = _configuration["edhSettings:api-version"];
                foreach (var communityTag in results)
                {
                    string tag = communityTag["tag"].ToString();

                    batch += c => c.For("AttributeCommunityTags")
                        .Key(communityToDelete, tag)
                        .DeleteEntryAsync();
                }

                // Delete AttributeCommunity record
                batch += c => c.For("AttributeCommunities")
                    .Key(communityToDelete)
                    .DeleteEntryAsync();
            }

            await batch.ExecuteAsync();
        }
    }
}
