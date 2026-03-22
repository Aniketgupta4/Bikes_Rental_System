const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handleBikeQuery = async (req, res) => {
  try {
    const { message } = req.body;

    // Agar user ne khali message bheja
    if (!message) {
      return res.status(400).json({ reply: "Please ask a question." });
    }

    // Gemini AI Setup
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // Prompt Engineering: AI ko strictly bike tak seemit rakhna
      systemInstruction: `You are 'BikeRental Bot', a helpful customer support assistant. Strictly follow these rules:
1. Length Limit: Keep ALL responses strictly between 10 to 40 words. Do not write long paragraphs.
2. Pricing: NEVER provide rental prices. If asked, say "Please check the homepage for individual bike pricing."
3. Allowed Topics: You MUST answer general and technical questions about bikes, scooters, electric bikes, and electric scooters (e.g., how to start, how to turn off, mileage, fuel estimates, and riding tips).
4. Out of Context: STRICTLY REFUSE to answer questions about cars, studying, coding, or anything unrelated to two-wheelers. Reply with: "I can only assist with bike, scooter, and rental queries."`,
    });

    // Get AI Response
    const result = await model.generateContent(message);
    const response = await result.response;

    // Send success reply to frontend
    res.json({ reply: response.text() });
  } catch (error) {
    console.error("Gemini API Error Details:", error.message);

    // 🛡️ ISOLATION LOGIC: Agar API fail hui toh app crash nahi hoga
    res.json({
      reply:
        "⚠️ Bike Assistant is temporarily offline due to high traffic, but you can still explore and book bikes normally!",
    });
  }
};
