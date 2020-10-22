using System;
using System.Collections.Generic;
using System.Text;

namespace LotRelease
{
    public class Release
    {
        public ICollection<ReleaseLotAssoc> Release_LotAssoc { get; set; }
        public DateTime ReleaseDate { get; set; }
    }

    public class ReleaseLotAssoc
    {
        public int EdhLotId { get; set; }
    }
}
