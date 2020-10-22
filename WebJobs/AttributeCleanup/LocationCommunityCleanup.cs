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
    public class LocationCommunityCleanup
    {
        private IConfigurationRoot _configuration { get; }
        private EdhDeleteClient _edhClient { get; }

        public LocationCommunityCleanup(IConfigurationRoot configuration, EdhDeleteClient client)
        {
            _configuration = configuration;
            _edhClient = client;
        }

        public async Task Run()
        {
            try
            {
                // Get LocationCommunity IDs orphaned (not associated with LocationGroupCommunity)
                List<int> orphanCommunityIdsEdh = await GetUnusedLocationCommunity();

                // Get LocationCommunity IDs used in PHD
                PhdClient phdClient = new PhdClient(_configuration);
                List<int> communityIdsInPhd = await phdClient.GetIdsUsedInPhd("scenariochoicelocations", "locationCommunityId", orphanCommunityIdsEdh);

                // Remove LocationCommunity IDs used in PHD from list of orphan IDs
                List<int> locationCommunityIdsToDelete = orphanCommunityIdsEdh.Except(communityIdsInPhd).ToList();

                // Delete LocationCommunity records
                await DeleteLocationCommunities(locationCommunityIdsToDelete);
            }
            catch(Exception ex)
            {
                Console.Out.WriteLine(ex.Message, ex.StackTrace);
            }
        }

        /// <summary>
        /// Get all the LocationCommunity IDs that are not associated with a LocationGroupCommunity
        /// </summary>
        /// <returns>List LocationCommunity IDs</returns>
        private async Task<List<int>> GetUnusedLocationCommunity()
        {
            // Setup EDH client
            string filter = "not(LocationGroupLocationCommunityAssocs/any()) and not(jobchoicelocations/any()) and not(jobplanoptionlocations/any()) and not(jobchangeorderplanoptionlocations/any())  and not(jobchangeorderchoicelocations/any())";
            string expand = "LocationGroupLocationCommunityAssocs,jobchoicelocations,jobplanoptionlocations,jobchangeorderplanoptionlocations,jobchangeorderchoicelocations";
            string select = "id,createdby";

            var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["edhSettings:apiKey"]}");
            };

            // Get IDs of Location Group Communities that are not being used (orphaned)
            ODataClient edhClient = new ODataClient(edhClientSettings);
            var results = (await edhClient.For("LocationCommunities")
                .Select(select)
                .Filter(filter)
                .Expand(expand)
                .FindEntriesAsync()).ToList();

            // Add Ids found to the list
            List<int> unusedCommunityIds = new List<int>();
            foreach (var community in results)
            {
                if (!community["createdBy"].ToString().Contains("ssis_"))
                {
                    unusedCommunityIds.Add(Convert.ToInt32(community["id"]));
                }
            }

            return unusedCommunityIds;
        }

        /// <summary>
        /// Delete records from LocationCommunity table in EDH. For every record to be deleted,
        /// delete any records in LocationCommunityTag table.
        /// </summary>
        /// <param name="communitiesToDelete">LocationCommunity IDs to be deleted</param>
        /// <returns></returns>
        private async Task DeleteLocationCommunities(List<int> communitiesToDelete)
        {
            // Setup EDH Client
            var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["edhSettings:apiKey"]}");
            };
            ODataClient edhClient = new ODataClient(edhClientSettings);

            foreach (int locationCommunityId in communitiesToDelete)
            {
                // Get all the LocationCommunityTags associated to locationCommunityId 
                var results = (await edhClient.For("LocationCommunityTags")
                    .Filter($"locationcommunityid eq {locationCommunityId}")
                    .FindEntriesAsync()).ToList();

                // Delete all tags found
                string apiVer = _configuration["edhSettings:api-version"];
                foreach (var communityTag in results)
                {
                    string tag = communityTag["tag"].ToString();

                    string tagUrl = $"locationcommunitytags(locationcommunityid={locationCommunityId}, tag='{HttpUtility.UrlEncode(tag)}')?{apiVer}";
                    await _edhClient.DeleteRecord(tagUrl);
                }

                // Delete LocationCommunity
                string communityUrl = $"locationcommunities({locationCommunityId})?{apiVer}";
                await _edhClient.DeleteRecord(communityUrl);
            }
        }
    }
}
