using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Text;

namespace LotRelease
{
    public class Lot
    {
        [DataMember(Name = "id")]
        public int Id { get; set; }
        [DataMember(Name = "lotStatusDescription")]
        public LotStatusEnum LotStatusDescription { get; set; }
        [DataMember(Name = "lastModifiedBy")]
        public string LastModifiedBy { get; set; }
        [DataMember(Name = "lastModifiedUtcDate")]
        public DateTime LastModifiedUtcDate { get; set; }

        [IgnoreDataMember]
        public LotBuildTypeEnum? LotBuildTypeDesc { get; set; }

        [DataMember(Name = "lotBuildTypeDesc")]
        public string LotBuildTypeStr
        {
            get
            {
                return LotBuildTypeDesc != null ? LotBuildTypeDesc.ToString() : null;
            }
            set
            {
                if (value != null)
                {
                    LotBuildTypeDesc = Enum.Parse<LotBuildTypeEnum>(value);
                }
            }
        }
    }

    public enum LotStatusEnum
    {
        PendingRelease,
        Available
    }

    public enum LotBuildTypeEnum
    {
        Dirt
    }
}
