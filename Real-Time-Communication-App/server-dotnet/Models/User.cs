using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace server_dotnet.Models
{
    [BsonIgnoreExtraElements]
    public class FriendRequests
    {
        [BsonRepresentation(MongoDB.Bson.BsonType.ObjectId)]
        [BsonElement("from")]
        public string From { get; set; } = null!;
        [BsonElement("sentAt")]
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }

    [BsonIgnoreExtraElements]
    public class Profile
    {
        [BsonElement("bio")]
        public string Bio { get; set; }

        [BsonElement("picture_url")]
        public string PictureUrl { get; set; }
    }

    [BsonIgnoreExtraElements]
    public class User
    {
        [BsonId]
        [BsonRepresentation(MongoDB.Bson.BsonType.ObjectId)]
        [BsonElement("_id")]
        public string Id { get; set; } = null!;

        [BsonElement("fullName")]
        public string FullName { get; set; } = null!;

        [BsonElement("email")]
        public string Email { get; set; } = null!;

        [BsonElement("password")]
        public string Password { get; set; } = null!;

        [BsonElement("friends")]
        [BsonRepresentation(MongoDB.Bson.BsonType.ObjectId)]
        public List<string> Friends { get; set; } = new List<string>();

        [BsonElement("friendRequests")]
        public List<FriendRequests> FriendRequests { get; set; } = new List<FriendRequests>();

        [BsonElement("profile")]
        public Profile Profile { get; set; }
    }
}
