class HFTextSimplifier {
    static async simplify(text, apiKey) {
      try {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-70B-Instruct",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              inputs: `Simplify this text for a 10-year-old: ${text}`,
              parameters: {
                max_new_tokens: 500,
                temperature: 0.7
              }
            })
          }
        );
  
        const result = await response.json();
        return result[0]?.generated_text || text;
      } catch (error) {
        console.error("Simplification error:", error);
        return text;
      }
    }
  }