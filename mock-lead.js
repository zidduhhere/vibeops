
async function triggerMockLead() {
  const payload = {
    userId: "test-user-id", // mock
    conversationId: "mock-conv-12345",
    messageBody: "Hi there, I found your portfolio online. I'm looking to build a new e-commerce website for my boutique in London. My budget is around $5,000 to $10,000. Please let me know if you are available. You can reach me via WhatsApp at +44 7700 900077 or reply to this email. Thanks, Sarah Jenkins, Jenkins Boutique.",
    clientEmail: "Sarah Jenkins <sarah@jenkinsboutique.com>",
    sentAt: new Date().toISOString()
  };

  try {
    const res = await fetch("http://localhost:3000/api/ai/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("Success:", data);
    } else {
      console.error("Error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

triggerMockLead();
