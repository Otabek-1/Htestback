const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB URI  
const uri = "mongodb+srv://burhonovotabek5:QiI6UzggY8RIZq1X@htest.wdvez.mongodb.net/?retryWrites=true&w=majority&appName=Htest";

// MongoClient yaratish
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tlsAllowInvalidCertificates: true, // Sertifikat tasdiqlashni o'chirish
});

async function connectToMongo() {
  try {
    await client.connect();
    console.log("MongoDB serveriga muvaffaqiyatli ulandik!");
    
    // Bazani qaytaring (tests bazasi deb faraz qilyapmiz)
    return client.db("tests"); // O'zingizning to'g'ri bazangiz nomini qo'ying
  } catch (error) {
    console.error("MongoDB ulanish xatosi:", error);
    throw error; // Xatoni tashlang
  }
}

module.exports = { connectToMongo };
