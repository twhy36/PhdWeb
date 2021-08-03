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
    public class AttributeGroupCleanup
    {
        private IConfigurationRoot _configuration { get; }

        public AttributeGroupCleanup(IConfigurationRoot configuration)
        {
            _configuration = configuration;
        }

        public async Task Run()
        {
            try
            {
                // Get unused AttributeGroupCommunity IDs from EDH
                List<int> unusedEdhAttributeGroupIds = await GetUnusedAttributeGroups();

                // Get AttributeGroupCommunity IDs used in PHD
                PhdClient phdClient = new PhdClient(_configuration);

                // [sales].[ScenarioChoiceAttribute]
                var taskPhdAttributeGroup = phdClient.GetIdsUsedInPhd("scenariochoiceattributes", "attributeGroupCommunityId", unusedEdhAttributeGroupIds);
                // [sales].[ScenarioChoiceLocationAttribute]
                var taskLocationAttribute = phdClient.GetIdsUsedInLocationAttribute("attributeGroupCommunityId", unusedEdhAttributeGroupIds);
                // [dt].[DPChoice_AttributeGroupCommunityAssoc]
                var taskChoiceAttribute = phdClient.GetIdsUsedInCollection("dPChoiceAttributeGroupCommunityAssocs", "attributeGroupCommunityId", unusedEdhAttributeGroupIds);

                await Task.WhenAll(taskPhdAttributeGroup, taskLocationAttribute, taskChoiceAttribute);

                var usedPhdAttributeGroupIds = taskPhdAttributeGroup.Result;
                var usedIdsLocationAttribute = taskLocationAttribute.Result;
                var usedIdsInChoiceAttribute = taskChoiceAttribute.Result;

                usedPhdAttributeGroupIds.AddRange(usedIdsLocationAttribute);
                usedPhdAttributeGroupIds.AddRange(usedIdsInChoiceAttribute);

                // Remove AttributeGroupCommunity IDs used in PHD from EDH list
                List<int> attributeGroupIdsToDelete = unusedEdhAttributeGroupIds.Except(usedPhdAttributeGroupIds).ToList();

                // Delete orphaned AttributeGroupCommunity records
                await DeleteAttributeGroups(attributeGroupIdsToDelete);
            }
            catch(Exception ex)
            {
                Console.Out.WriteLine(ex.Message, ex.StackTrace);
            }
        }

        /// <summary>
        /// Get all of the AttributeGroupCommunity IDs that are orphaned/not in use from EDH
        /// </summary>
        /// <returns>List of AttributeGroupCommunity IDs</returns>
        private async Task<List<int>> GetUnusedAttributeGroups()
        {
            // Setup EDH client
            string filter = "not(attributegroupoptioncommunityassocs/any()) and not(jobchoiceattributes/any()) and not(jobplanoptionattributes/any()) " +
                "and not(jobchangeorderplanoptionattributes/any()) and not(jobchangeorderchoiceattributes/ any()) and not(jobplanoptionlocationattributes/any()) " +
                "and not(jobchoicelocationattributes/any()) and not(jobchangeorderchoicelocationattributes/any())";
            string expand = "AttributeGroupOptionCommunityAssocs,jobchoiceattributes,jobplanoptionattributes,jobchangeorderplanoptionattributes," +
                "jobchangeorderchoiceattributes,jobplanoptionlocationattributes,jobchoicelocationattributes,jobchangeorderchoicelocationattributes";
            string select = "id,createdBy";

            var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["edhSettings:apiKey"]}");
            };

            // Get list of AttributeGroupCommunity IDs orphaned
            ODataClient edhClient = new ODataClient(edhClientSettings);
            var results = (await edhClient.For("AttributeGroupCommunities")
                .Expand(expand)
                .Filter(filter)
                .Select(select)
                .FindEntriesAsync()).ToList();

            // Add IDs to the list
            List<int> unusedAttriubteGroupIds = new List<int>();
            foreach (var attribute in results)
            {
                if (!attribute["createdBy"].ToString().Contains("ssis_"))
                {
                    unusedAttriubteGroupIds.Add(Convert.ToInt32(attribute["id"]));
                }
            }

            return unusedAttriubteGroupIds;
        }

        /// <summary>
        /// Delete orphan records from AttributeGroupCommunity table in EDH. For each record to be deleted,
        /// delete any associated records in AttributeGroupAttributeCommmunityAssoc and AttributeGroupCommunityTag
        /// tables in EDH.
        /// </summary>
        /// <param name="attributeGroupsToDelete">AttributeGroupCommunity IDs to be deleted</param>
        /// <returns></returns>
        private async Task DeleteAttributeGroups(List<int> attributeGroupsToDelete)
        {
            // Setup EDH Client
            var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["edhSettings:apiKey"]}");
            };
            ODataClient edhClient = new ODataClient(edhClientSettings);
            var batch = new ODataBatch(edhClient);

            foreach (int attributeToDelete in attributeGroupsToDelete)
            {
                // Get all AttributeGroupCommunityAssoc records for attributeToDelete
                var results = (await edhClient.For("AttributeGroupAttributeCommunityAssocs")
                    .Filter($"attributegroupcommunityid eq {attributeToDelete}")
                    .FindEntriesAsync()).ToList();

                // Delete all records found in AttributeGroupAttributeCommunityAssoc table
                string apiVer = _configuration["edhSettings:api-version"];
                foreach (var assoc in results)
                {
                    int attributeCommunityId = Convert.ToInt32(assoc["attributeCommunityId"]);

                    batch += c => c.For("AttributeGroupAttributeCommunityAssocs")
                        .Key(attributeCommunityId, attributeToDelete)
                        .DeleteEntryAsync();
                }

                // Get all AttributeGroupCommunityTags records for attributeToDelete
                results = (await edhClient.For("AttributeGroupCommunityTags")
                    .Filter($"attributeGroupCommunityId eq {attributeToDelete}")
                    .FindEntriesAsync()).ToList();

                // Delete all records found in AttributeGroupCommunityTags table
                foreach (var attributeTags in results)
                {
                    string tag = attributeTags["tag"].ToString();

                    batch += c => c.For("AttributeGroupCommunityTags")
                        .Key(attributeTags, tag)
                        .DeleteEntryAsync();
                }

                // Delete AttributeGroupCommunity record
                batch += c => c.For("AttributeGroupCommunities")
                    .Key(attributeToDelete)
                    .DeleteEntryAsync();
            }

            await batch.ExecuteAsync();
        }
    }
}
