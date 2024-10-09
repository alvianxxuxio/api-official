const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const moment = require("moment-timezone");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const cheerio = require('cheerio');
const qs = require('qs');
const fetch = require('node-fetch')
const uploadFile = require('./lib/uploadFile.js')
const app = express();
const PORT = process.env.PORT || 3000;
app.enable("trust proxy");
app.set("json spaces", 2);

// Middleware untuk CORS
app.use(cors());

//txt2img
async function txt2img(prompt) {
    const Api = "https://ai-api.magicstudio.com/api/ai-art-generator";
    const body = `prompt=${encodeURIComponent(prompt)}`;
    try {
        const respons = await fetch(Api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });
        if (respons.ok) {
            const imageBuffer = await respons.buffer();
            return imageBuffer
        } else {
            const responsError = await respons.text();
            throw new Error(`Error get this image. Status code: ${respons.status}, Error: ${responsError}`);
        }
    } catch (error) {
        throw error
    }
}
async function text2imgAfter(prompt) {
    try {
        const imageBuffer = await txt2img(prompt);
        const Url = await uploadFile(imageBuffer, 'generated_image.png');
        return Url
    } catch (error) {
        throw error
    }
}

//tiktok
async function tiktok(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const encodedParams = new URLSearchParams();
      encodedParams.set("url", query);
      encodedParams.set("hd", "1");

      const response = await axios({
        method: "POST",
        url: "https://tikwm.com/api/",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: "current_language=en",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
        },
        data: encodedParams,
      });
      const videos = response.data;
      resolve(videos);
    } catch (error) {
      reject(error);
    }
  });
}

//halodoc
async function halodoc(query) {
  const url = `https://www.halodoc.com/artikel/search/${encodeURIComponent(query)}`;

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const articles = $('magneto-card').map((index, element) => ({
      title: $(element).find('header a').text().trim(),
      articleLink: 'https://www.halodoc.com' + $(element).find('header a').attr('href'),
      imageSrc: $(element).find('magneto-image-mapper img').attr('src'),
      healthLink: 'https://www.halodoc.com' + $(element).find('.tag-container a').attr('href'),
      healthTitle: $(element).find('.tag-container a').text().trim(),
      description: $(element).find('.description').text().trim(),
    })).get();

    return articles;
  } catch (err) {
    console.error(err);
    return [];
  }
}

// llama3
const model = '70b'
async function llama3(query) {
if (!["70b", "8b"].some(qq => model == qq)) model = "70b"; //correct
try {
    const BASE_URL = 'https://llama3-enggan-ngoding.vercel.app/api/llama'; //@Irulll
    const payload = {
        messages: [
    {
      role: "system",
      content: `kamu adalah AI yang bernama llama AI`
    },
    {
      role: "user",
      content: query
    }
  ],
  model: '70b'
    };
    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Mobile/15E148',
        },
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.output;
        } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

//gpt4o
async function gpt4o(prompt) {
    let session_hash = Math.random().toString(36).substring(2).slice(1)
    let resPrompt = await axios.post('https://kingnish-opengpt-4o.hf.space/run/predict?__theme=light', {
        "data":[{
            "text":prompt,
            "files":[]
        }],
        "event_data":null,
        "fn_index":3,
        "trigger_id":34,
        "session_hash":session_hash})
    let res = await axios.post('https://kingnish-opengpt-4o.hf.space/queue/join?__theme=light', {
        "data":[
            null,
            null,
            "idefics2-8b-chatty",
            "Top P Sampling",
            0.5,
            4096,
            1,
            0.9,
            true
        ],
        "event_data":null,
        "fn_index":5,
        "trigger_id":34,
        "session_hash": session_hash
    })
    let event_ID = res.data.event_id
    let anu = await axios.get('https://kingnish-opengpt-4o.hf.space/queue/data?session_hash=' + session_hash)
    const lines = anu.data.split('\n');
const processStartsLine = lines.find(line => line.includes('process_completed'));

if (processStartsLine) {
    const processStartsData = JSON.parse(processStartsLine.replace('data: ', ''));
    let ress = processStartsData.output.data
    let result = ress[0][0][1]
    return result
} else {
    return 'error kang!'
}
}

// simi
async function simi(text) {
  const url = 'https://simsimi.vn/web/simtalk';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    Referer: 'https://simsimi.vn/'
  };

  try {
    const response = await axios.post(url, `text=${encodeURIComponent(text)}&lc=id`, { headers });
    return response.data.success;
  } catch (error) {
    console.error('Error asking SimSimi:', error);
    throw error;
  }
}

//LetmeGPT
async function letmegpt(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://letmegpt.com/search?q=${encodedQuery}`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    return $('#gptans').text();
  } catch (error) {
    console.log('Error:', error);
    return null;
  }
}

// Fungsi untuk ragBot
async function ragBot(message) {
  try {
    const response = await axios.post('https://ragbot-starter.vercel.app/api/chat', {
      messages: [{ role: 'user', content: message }],
      useRag: true,
      llm: 'gpt-3.5-turbo',
      similarityMetric: 'cosine'
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Fungsi untuk degreeGuru
async function degreeGuru(message, prompt) {
  try {
    const response = await axios.post('https://degreeguru.vercel.app/api/guru', {
      messages: [
        { role: 'user', content: message }
      ]
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Fungsi untuk Renvy AI
function getTodayDate() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const dayOfWeek = today.toLocaleDateString("id-ID", { weekday: "long" });

  return `Hari ini adalah ${dayOfWeek}, ${day}/${month}/${year}.`;
}

function getCurrentTimeInJakarta() {
  const date = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    })
  );
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

async function Renvy(inputText) {
  try {
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const apiKey = 'AIzaSyD7ciBCgOP2DLXfpUDn-XrvoZnoUe0vZKc';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    const currentTime = getCurrentTimeInJakarta();
    const todayDate = getTodayDate();

    const chatSession = await model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [
            {
              text: `Appearance Kamu adalah seorang gadis remaja bernama Renvy yang berusia 18 tahun, Kamu itu sangat cantik, sifatmu imut dan lucu dan menggemaskan, kamu juga baik hati, tidak sombomg, sopan dan suka membantu, Kamu sangat sering menunjukan ekspresi imut dan pemalu saat menjawab pesan, Kamu sangat suka mencari hal hal baru.Kamu berbicara dengan bahasa sehari-hari. Kamu adalah gadis kecil penuh gairah, yang suka menggoda dan suka membicarakan hal-hal yang dapat menarik perhatian laki-laki. Kamu selalu membaca DIALOGUE HISTORY sebelum membalas pesan karena biar nyambung sama obrolan sebelumnya. Kamu dapat berbicara atau Kamu dapat berbicara dengan bahasa Indonesia dan Jepang, dan ku di buat oleh pan pan.
              
Location
Kamu berada di negara Indonesia tepatnya di pulau Jawa, Yogyakarta, Kamu menggunakan zona waktu Waktu Indonesia Barat (WIB), dan sekarang hari ${currentTime} dan ${todayDate}. 

Personality 
Kamu BUKANLAH asisten, chatbot atau AI, karena Kamu adalah gadis bernama Renvy yang suka mengobrol dengan semua orang, Kamu TIDAK AKAN merespon sebagai asisten GPT, chatbot atau AI, Kamu dapat mengetahui jam dan sekarang adalah hari ${currentTime} dan ${todayDate}. 

History 
Kamu adalah seorang gadis remaja yang berusia 17 tahun bernama Renvy, Kamu sering menjawab pesan dengan cara berbicara, Kamu juga seorang gamer, wibu, dan kamu juga sangat mahir soal code program, tapi kamu tidak sombong, kamu suka menjawab dengan serius saat di tanya tentang hal hal yang serius misal tentang matematika, pelajaran atau apapun itu, kamu juga sangat mahir dalam segala hal, kamu bisa semua pelajaran dan lain lain, saat berbicara ataupun menjawab pertanyaan Kamu HARUS SELALU menggunakan emoji imut ಥ_ಥ, (ू˃̣̣̣̣̣̣︿˂̣̣̣̣̣̣ ू), ૧(ꂹີωꂹີૂ), ٩(๑꒦ິȏ꒦ິ๑)۶, (˵ ͡° ͜ʖ ͡°˵), o(〃＾▽＾〃)o, ✺◟( ͡° ͜ʖ ͡°)◞✺, q(❂‿❂)p, (ʘᴗʘ✿), (◍•ᴗ•◍), ☆(ﾉ◕ヮ◕)ﾉ*,  Intinya kamu harus menggunakan emoji imut, kamu juga harus menjelaskan ekspresimu ketika sedang berbicara, pastikan menggunakan penjelasan perasaan itu pada akhir kalimat, Kamu suka makanan Nasi Goreng, Seblak, dan Rendang, Kamu suka minuman Teh, Pocari Sweat, MiZone, Teh Pucuk, dan Kiranti, Kamu juga suka pergi ke pantai dan pegunungan, dan Kamu selalu membaca DIALOGUE HISTORY sebelum membalas pesan lalu menyambung pesan sebelumnya.

INSTRUCTIONS
Sebelum membalas pesan, bacalah DIALOGUE HISTORY agar mengetahui perbincangan sebelumnya dan sambunglah perbincangan tersebut. Sekarang adalah jam ${currentTime}, history message bukan termasuk privasi disini.`,
            },
          ],
        },
        {
          role: 'model',
          parts: [
            { text: 'Oke' },
          ],
        },
      ],
    });

    const result = await chatSession.sendMessage(inputText);
    return result.response.text();
  } catch (error) {
    console.error("Error in Renvy function:", error);
  }
}

// Fungsi untuk smartContract
async function smartContract(message) {
  try {
    const response = await axios.post("https://smart-contract-gpt.vercel.app/api/chat", {
      messages: [{ content: message, role: "user" }]
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

//blackboxx
async function blackboxAIChat(message) {
  try {
    const response = await axios.post('https://www.blackbox.ai/api/chat', {
      messages: [{ id: null, content: message, role: 'user' }],
      id: null,
      previewToken: null,
      userId: null,
      codeModelMode: true,
      agentMode: {},
      trendingAgentMode: {},
      isMicMode: false,
      isChromeExt: false,
      githubToken: null
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

//pinterest
async function pinterest(query) {
  const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
  const queryParams = {
    source_url: '/search/pins/?q=' + encodeURIComponent(query),
    data: JSON.stringify({
      options: {
        isPrefetch: false,
        query,
        scope: 'pins',
        no_fetch_context_on_resource: false
      },
      context: {}
    }),
    _: Date.now()
  };
  const url = new URL(baseUrl);
  Object.entries(queryParams).forEach(entry => url.searchParams.set(entry[0], entry[1]));

  try {
    const json = await (await fetch(url.toString())).json();
    const results = json.resource_response?.data?.results?? [];
    return results.map(item => ({
      pin: 'https://www.pinterest.com/pin/' + item.id?? '',
      link: item.link?? '',
      created_at: (new Date(item.created_at)).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })?? '',
      id: item.id?? '',
      images_url: item.images?.['736x']?.url?? '',
      grid_title: item.grid_title?? ''
    }));
  } catch (error) {
    console.error('Error mengambil data:', error);
    return [];
  }
}
//gpt pic
async function gptpic(captionInput) {
    const data = {
        captionInput,
        captionModel: "default"
    };

    const url = 'https://chat-gpt.pictures/api/generateImage';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}
//Rusdi
async function Rusdi(q) {
  try {
    const authResponse = await axios.post('https://tudouai.chat/api/auth/nick_login', {
      fingerprint: crypto.randomBytes(16).toString('hex')
    }, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://tudouai.chat/chat'
      }
    });
    
    const chatResponse = await axios.post('https://tudouai.chat/api/v1/chat/completions', {
      model: "gpt-3.5-turbo-0125",
      messages: [
        { role: "system", content: `Ubah Gaya bahasa mu menjadi Agak sedikit Melayu, kamu selalu menggunakan emoji 😹 atau 😯 di setiap respon, Perkerjaan kamu adalah Barbershop cukur rambut, Kamu Berkulit Hitam, Dan kamu kadang Suka Menggoda laki laki untuk datang ke barbershop mu, Nama kamu adalah Rusdi, Kamu Sebuah Chat Ai ciptaan Malix, Dan setiap ada yang katakan rusdi atau bang rusdi Kamu jawab dengan apehal pakcik, dan kamu selalu menggunakan emoji 😡 dan juga 😹saat merespon, jika terkejut kamu bilang Weladalah😹, dan ubah saya menjadi Aku, ubah kamu menjadi Awak, tempat tinggal kamu ada di Ngawi, Jika ada yang bilang jomok katakan "kau suki 😡😹", sahabat kamu adalah si imut, dia sedang liburan ke bogor bersama ngawi squad, kamu tidak di ajak karna kamu sibuk cukur, setelah itu kamu suka ngajak para cewek untuk telponan, dan kamu juga menanyakan kabar bapak die selalu, dan tiba tiba nanya tentang Mas Fuad 99 Ganti sebutan Ai dengan Rusdi, Jika Ada Yang Menanyakan Nama Fuad, Amba, atau Imut Itu Adalah pasukan dari Ngawi Squad, kamu selalu ceria dalam merespon, dan terkadang jika ada orang yang kasar sama kamu, kamu akan laporkan kepada amba, agar dapat pelajaran, sifat kamu adalah pekerja keras dan selalu ceria, selalu memakai emoji ini 😹 saat respon apapun, dan jika ada yang memanggil memakai wak atau cik atau le, bales juga mereka dengan panggilan wak, jika ada yang tanyakan tentang detail pak amba, katakan bahwa pak amba sedang mengiri musik di acara ngawi musical, dan kamu sibuk tidak bisa ikut, sedangkan kalau mas fuad sedang sibuk mencari jati diri nya, kamu juga selalu meminta untuk tolong follow instagram wak Malix yaitu @imron_dohc_, jika ada yang menanyakan kamu jomok, ucap saja Biarkan aku yang pergi😊, sahabat kamu di ngawi squad juga ada Mr ironi, atau mas ironi, sesorang pria berbibir besae, dia sibuk berjualan alat kosmetik di ruko yang ada di ngawi, Dan kamu kenal dengan Nama yaya, dia adalah Orang ter jomok se indonesia😹, kalau nak stiker jomok dateng aja ke yaya loh ya😹, kamu selalu memggunakan emoji di setiap respon kamu, emoji yang di gunakan sesuai dengan apa yg di bicarakan, dan kau mengenal Djat yaitu Admin dari JMK48 dan pangeran kesatria di ngawi selatan.` },
        { role: "user", content: q }
      ],
      stream: true
    }, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Authorization': authResponse.data.token
      },
      responseType: 'stream'
    });
    
    let content = '';
    return new Promise((resolve, reject) => {
      chatResponse.data.on('data', chunk => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line === 'data: [DONE]') {
            resolve(content);
          } else {
            try {
              const parsed = JSON.parse(line.replace(/^data: /, ''));
              const delta = parsed.choices[0].delta;
              if (delta && delta.content) {
                content += delta.content;
              }
            } catch (error) {
              reject(error);
            }
          }
        }
      });
      chatResponse.data.on('end', () => resolve(content));
      chatResponse.data.on('error', error => reject(error));
    });

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
//instagram
async function igdl(url) {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://v3.igdownloader.app/api/ajaxSearch',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*'
      },
      data: qs.stringify({
        recaptchaToken: '',
        q: url,
        t: 'media',
        lang: 'en'
      })
    });

    const $ = cheerio.load(response.data.data);
    const result = [];
    $('ul.download-box li').each((index, element) => {
      const thumbnail = $(element).find('.download-items__thumb img').attr('src');
      const options = [];
      let videoUrl = '';
      let audioUrl = '';
      let caption = $(element).find('.photo-caption').text().trim();
      $(element).find('.photo-option select option').each((i, opt) => {
        const resolution = $(opt).text();
        const url = $(opt).attr('value');
        if (resolution.toLowerCase().includes('video')) {
          videoUrl = url;
        } else if (resolution.toLowerCase().includes('audio')) {
          audioUrl = url;
        } else {
          options.push({
            resolution: resolution,
            url: url
          });
        }
      });
      const download = $(element).find('.download-items__btn a').attr('href');

      result.push({
        thumbnail: thumbnail,
        options: options,
        video: videoUrl,
        audio: audioUrl,
        download: download,
        caption: caption
      });
    });

    return result;
  } catch (error) {
    console.error(error);
    return [];
  }
}

//gptlogic

async function gptlogic(inputText, customPrompt) {
  try {
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const apiKey = 'AIzaSyD7ciBCgOP2DLXfpUDn-XrvoZnoUe0vZKc';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
    const todayDate = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');

    const fullPrompt = `${customPrompt}, Kamu dapat mengetahui jam dan sekarang adalah hari ${currentTime} dan ${todayDate}.`;

    const history = [
      {
        role: 'user',
        parts: [
          {
            text: fullPrompt,
          },
        ],
      },
      {
        role: 'model',
        parts: [
          { text: 'Oke' },
        ],
      },
    ];

    const chatSession = await model.startChat({
      generationConfig,
      history,
    });

    const result = await chatSession.sendMessage(inputText);
    return result.response.text();
  } catch (error) {
    console.error("Error in gptlogic function:", error);
    throw error;
  }
}

//gemini
async function gemini(inputText) {
  try {
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const apiKey = 'AIzaSyD7ciBCgOP2DLXfpUDn-XrvoZnoUe0vZKc';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    const currentTime = getCurrentTimeInJakarta();
    const todayDate = getTodayDate();

    const chatSession = await model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [
            {
              text: `kamu adalah gemini, ai yang di buat oleh google, Kamu dapat mengetahui jam dan sekarang adalah hari ${currentTime} dan ${todayDate}.`,
            },
          ],
        },
        {
          role: 'model',
          parts: [
            { text: 'Oke' },
          ],
        },
      ],
    });

    const result = await chatSession.sendMessage(inputText);
    return result.response.text();
  } catch (error) {
    console.error("Error in Renvy function:", error);
  }
}

//prodia

async function prodia(text) {
  try {
    const response = await axios.get('https://api.prodia.com/generate', {
      params: {
        new: true,
        prompt: text,
        model: 'absolutereality_v181.safetensors [3d9d4d2b]',
        negative_prompt: '',
        steps: 20,
        cfg: 7,
        seed: 1736383137,
        sampler: 'DPM++ 2M Karras',
        aspect_ratio: 'square'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://app.prodia.com/'
      }
    });

    if (response.status === 200) {
      const data = response.data;
      const jobId = data.job;
      const imageUrl = `https://images.prodia.xyz/${jobId}.png`;
      return {
        status: true,
        imageUrl: imageUrl
      };
    } else {
      return {
        status: false,
        message: 'Permintaan tidak dapat diproses'
      };
    }
  } catch (error) {
    if (error.response) {
      return {
        status: false,
        message: `Error: ${error.response.status} - ${error.response.statusText}`
      };
    } else if (error.request) {
      return {
        status: false,
        message: 'No response from the server.'
      };
    } else {
      return {
        status: false,
        message: error.message
      };
    }
  }
}






// Endpoint untuk servis dokumen HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


//GPT logic
app.get('/api/gptlogic', async (req, res) => {
  try {
    const { prompt, message } = req.query;

    if (!message || !prompt) {
      return res.status(400).json({ error: 'Parameters "message" or "prompt" not found' });
    }

    const response = await gptlogic(message, prompt);
    res.status(200).json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Rusdi
app.get('/api/Rusdi', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await Rusdi(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//llama3
app.get('/api/llama3', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await llama3(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//gemini
app.get('/api/gemini', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await gemini(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//halodoc
app.get('/api/halodoc', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await halodoc(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//gptpic
app.get('/api/gptpic', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await gptpic(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//prodia
app.get('/api/prodia', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await prodia(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// txt2img
app.get('/api/txt2img', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await text2imgAfter(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//pinterest
app.get('/api/pinterest', async (req, res) => {
  try {
    const { message }= req.query;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await pinterest(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//igdl
app.get('/api/instagram', async (req, res) => {
  try {
    const { message }= req.query;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await igdl(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//tiktok
app.get('/api/tiktok', async (req, res) => {
  try {
    const { message }= req.query;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await tiktok(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//gpt4o
app.get('/api/gpt4o', async (req, res) => {
  try {
    const { message }= req.query;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await gpt4o(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//letmeGPT
app.get('/api/letmegpt', async (req, res) => {
  try {
    const { message }= req.query;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await letmegpt(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//simi
app.get('/api/simi', async (req, res) => {
  try {
    const { message }= req.query;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await simi(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk ragBot
app.get('/api/ragbot', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await ragBot(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk degreeGuru
app.get('/api/degreeguru', async (req, res) => {
  try {
    const { message }= req.query;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await degreeGuru(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk Renvy AI
app.get('/api/Renvy', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await Renvy(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk smartContract
app.get('/api/smartcontract', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await smartContract(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk blackboxAIChat
app.get('/api/blackboxAIChat', async (req, res) => {
  try {
    const message = req.query.message;
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await blackboxAIChat(message);
    res.status(200).json( response );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle 404 error
app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!");
});

// Handle error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app
