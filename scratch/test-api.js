const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI('AIzaSyCUE7uakScgTvLB8CXn-n1JSFqEv3oNmGA');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    const result = await model.generateContent("hello");
    console.log(await result.response.text());
  } catch (error) {
    console.error(error.message);
  }
}
test();
