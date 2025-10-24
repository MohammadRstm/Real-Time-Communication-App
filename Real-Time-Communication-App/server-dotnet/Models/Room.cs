using MongoDB.Bson.Serialization.Attributes;

namespace server_dotnet.Models
{
    [BsonIgnoreExtraElements]
    public class Room
    {
        [BsonId]
        [BsonRepresentation(MongoDB.Bson.BsonType.ObjectId)]
        [BsonElement("_id")]
        public string Id { get; set; } = null!;

        [BsonElement("roomCode")]
        public string RoomCode { get; set; } = null!;

        [BsonElement("createdBy")]
        [BsonRepresentation(MongoDB.Bson.BsonType.ObjectId)]
        public string CreatedBy { get; set; } = null!;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
