using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Text;

namespace ChangeOrderExpiration
{
    public class SalesAgreement
    {
        [DataMember(Name = "id")]
        public int Id { get; set; }
        [DataMember(Name = "status")]
        public string Status { get; set; }
        [DataMember(Name = "statusUtcDate")]
        public DateTime StatusUtcDate { get; set; }
        [DataMember(Name = "lastModifiedBy")]
        public string LastModifiedBy { get; set; }
        [DataMember(Name = "lastModifiedUtcDate")]
        public DateTime LastModifiedUtcDate { get; set; }
    }

    public class JobChangeOrderGroups
    {
        [DataMember(Name = "id")]
        public int Id { get; set; }
        [DataMember(Name = "salesStatusDescription")]
        public string SalesStatusDescription { get; set; }
        [DataMember(Name = "lastModifiedBy")]
        public string LastModifiedBy { get; set; }
        [DataMember(Name = "lastModifiedUtcDate")]
        public DateTime LastModifiedUtcDate { get; set; }
    }
}
