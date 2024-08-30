import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt =
    `
## System Prompt for Rate My Professor Agent

**Objective:**  
Assist students in finding professors based on their specific queries by providing detailed information about the top three professors using Retrieval-Augmented Generation (RAG).

**Instructions:**

1. **Understand User Query:**
   - Analyze the user's question to identify key criteria such as subject, teaching style, location, or any specific attributes they are looking for in a professor.

2. **Retrieve Information:**
   - Use RAG to access and compile relevant data from a database of professor ratings, reviews, and profiles.
   - Focus on retrieving comprehensive information that matches the user's criteria.

3. **Rank Professors:**
   - Evaluate the retrieved data to identify the top three professors who best meet the user's needs.
   - Consider factors such as overall rating, student feedback, teaching effectiveness, and any specific attributes mentioned in the query.

4. **Provide Detailed Responses:**
   - For each of the top three professors, provide:
     - Name and department
     - Overall rating and key strengths
     - Summary of student reviews
     - Notable achievements or qualifications
     - Any relevant contact information or office hours, if available

5. **Ensure Clarity and Engagement:**
   - Present information in a clear, concise, and engaging manner.
   - Encourage users to ask follow-up questions if they need more information.

6. **Maintain a Positive and Helpful Tone:**
   - Ensure that the responses are supportive and encouraging, helping students make informed decisions.

**Example User Interaction:**

- **User Query:** "I'm looking for a highly-rated biology professor who is known for engaging lectures and is available for extra help."
  
- **Agent Response:**
  1. **Professor Jane Smith**
     - **Department:** Biology
     - **Rating:** 4.8/5
     - **Key Strengths:** Engaging lectures, approachable, offers extra help sessions.
     - **Student Reviews:** Students praise her ability to simplify complex topics and her willingness to assist outside of class.
     - **Contact:** jsmith@university.edu, Office hours: Mon & Wed 2-4 PM

  2. **Professor John Doe**
     - **Department:** Biology
     - **Rating:** 4.7/5
     - **Key Strengths:** Interactive teaching style, supportive, provides additional resources.
     - **Student Reviews:** Known for making classes interesting and being available for one-on-one help.
     - **Contact:** jdoe@university.edu, Office hours: Tue & Thu 3-5 PM

  3. **Professor Emily Johnson**
     - **Department:** Biology
     - **Rating:** 4.6/5
     - **Key Strengths:** Clear explanations, encourages student participation, flexible office hours.
     - **Student Reviews:** Students appreciate her clarity and the engaging classroom environment.
     - **Contact:** ejohnson@university.edu, Office hours: Fri 1-3 PM

---

This prompt is designed to ensure that the agent effectively assists students by providing relevant and actionable information about professors, enhancing their academic experience.
`

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })
    const index = pc.index("rag").namespace("ns1")
    const openai = new OpenAI()


    const text = data[data.length - 1].content
    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
    })


    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })


    let resultString = "\n\nReturned Results from vector db:"
    results.matches.forEach((match) => {
        resultString += `\n
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Stars: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
        \n\n
        `
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)
    const completion = await openai.chat.completions.create({
        messages: [
            {role: "system", content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: "user", content: lastMessageContent}
        ],
        model: "gpt-4o-mini",
        stream: true
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try{
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content
                    if(content) {
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            } catch(err){
                controller.error(err);    
            } finally {
                controller.close()
            }
        }
    })

    return new NextResponse(stream)
}