const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const yts = require("yt-search");
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
const undici = require('undici')
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

// igstalk
async function igstalk(username) {
  let html = await (await fetch("https://dumpoir.io/v/" + username)).text();
  const $ = cheerio.load(html);
  const Profile = {
    image: $("#user-page > div.user > div.row > div > div.user__img")
      .attr("style")
      .replace(/(background-image: url\(\'|\'\);)/gi, ""),
    username: $(".user__title h4").text().trim(),
    fullName: $(".user__title h1").text().trim(),
    bio: $(".user__info-desc").text().trim(),
    posts: $(".list__item").eq(0).text().trim(),
    followers: $(".list__item").eq(1).text().trim(),
    following: $(".list__item").eq(2).text().trim(),
  };
  const Post = [];
  $(".content__item").each((index, element) => {
    const post = {};
    const img = $(element).find(".content__img").attr("src");
    const desc = $(element).find(".content__text p").text();
    const likes = parseInt($(element).find(".bx-like + span").text());
    const comments = parseInt(
      $(element).find(".bx-comment-dots + span").text(),
    );
    const time = $(element).find(".bx-time + span").text();

    if (!isNaN(likes) && !isNaN(comments) && img && desc && time) {
      post.image = img;
      post.description = desc;
      post.likes = likes;
      post.comments = comments;
      post.time = time;
      Post.push(post);
    }
  });

  const result = {
    Profile: Profile,
    Post: Post,
  };
  return result;
}


// youtube
const yt = async (query) => {
  try {
    const response = await axios.get(`https://mxmxk-helper.hf.space/yt?query=${query}`);
    
    if (response.data && response.data.result) {
      const result = response.data.result;

      return {
        success: true,
        result: {
          type: result.type,
          videoId: result.videoId,
          url: result.url,
          title: result.title,
          description: result.description,
          image: result.image,
          thumbnail: result.thumbnail,
          seconds: result.seconds,
          timestamp: result.timestamp,
          duration: result.duration,
          ago: result.ago,
          views: result.views,
          author: {
            name: result.author.name,
            url: result.author.url
          },
          download: {
            audio: `https://mxmxk-helper.hf.space/yt/dl?url=${result.url}&type=audio&quality=128`,
            video: `https://mxmxk-helper.hf.space/yt/dl?url=${result.url}&type=video&quality=1080`
          }
        }
      };
    } else {
      return { success: false, message: 'No results found' };
    }
  } catch (error) {
    console.error('Error fetching YouTube content:', error);
    return { success: false, message: 'Error fetching YouTube content' };
  }
};
// mediafire 
async function mf(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await require("undici").fetch(url);
            const data = await response.text();
            const $ = cheerio.load(data);
            
            let name = $('.dl-info > div > div.filename').text();
            let link = $('#downloadButton').attr('href');
          let det = $('ul.details').html().replace(/\s/g, "").replace(/<\/li><li>/g, '\n').replace(/<\/?li>|<\/?span>/g, '');
            let type = $('.dl-info > div > div.filetype').text();

        

            const hasil = {
                filename: name,
                filetype: type,
                link: link,
                detail: det
            };

            resolve(hasil);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
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
// aio
/*
Scrape aio 
Cuma ytdl nya mati jir😂
By rian
Jangan delete wm
*/
async function aio(url) {
const { data } = await axios({
        method: 'POST',
        url: 'https://aiovd.com/wp-json/aio-dl/video-data/',
        data: `url=${encodeURIComponent(url)}`
    });
let an = data
let a = data.medias
return a
}

// gdrive
async function GDriveDl(url) {
	let id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))?.[1]
	if (!id) return reply('ID Not Found')
	let res = await fetch(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`, {
		method: 'post',
		headers: {
			'accept-encoding': 'gzip, deflate, br',
			'content-length': 0,
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
			'origin': 'https://drive.google.com',
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
			'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=',
			'x-drive-first-party': 'DriveWebUi',
			'x-json-requested': 'true' 
		}
	})
	let { fileName, sizeBytes, downloadUrl } =  JSON.parse((await res.text()).slice(4))
	if (!downloadUrl) return reply('Link Download Limit!')
	let data = await fetch(downloadUrl)
	if (data.status !== 200) throw data.statusText
	return {
		downloadUrl, fileName,
		fileSize: (sizeBytes / 1024 / 1024).toFixed(2),
		mimetype: data.headers.get('content-type')
	}
}
// videy
async function videy(url) {
    try {
        const parsedUrl = new URL(url);
        const id = parsedUrl.searchParams.get('id');
        
        if (!id || id.length !== 9) {
            throw new Error('ID video tidak valid.');
        }
        
        let tipeFile = id[8] === '2' ? '.mov' : '.mp4';

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        const tautanVideo = `https://cdn.videy.co/${id}${tipeFile}`;
        return tautanVideo;
    } catch (error) {
        console.error('Kesalahan saat mengambil tautan video:', error.message);
        return null;
    }
}

// anime
async function anime(query) {
  try {
    // Fetch the search results page
    const searchResponse = await axios.get(`https://kusonime.com/?s=${query}&post_type=post`);
    const $ = cheerio.load(searchResponse.data);

    // Extract the first anime link from the search results
    const animeLinks = [];
    $('div.content > h2 > a').each((i, element) => {
      animeLinks.push($(element).attr('href'));
    });

    if (animeLinks.length === 0) {
      throw new Error('No anime found.');
    }

    // Fetch the anime details page from the first result
    const animePageResponse = await axios.get(animeLinks[0]);
    const $animePage = cheerio.load(animePageResponse.data);

    // Extract details from the anime page
    const title = $animePage('div[class="post-thumb"] > h1').text();
    const thumb = $animePage('div[class="post-thumb"] > img').attr('src');
    const title_jp = $animePage('div.info > p:nth-child(1)').text().split(":")[1].trim();
    const genre = $animePage('div.info > p:nth-child(2)').text().split(":")[1].trim();
    const season = $animePage('div.info > p:nth-child(3)').text().split(":")[1].trim();
    const producers = $animePage('div.info > p:nth-child(4)').text().split(":")[1].trim();
    const type = $animePage('div.info > p:nth-child(5)').text().split(":")[1].trim();
    const status_anime = $animePage('div.info > p:nth-child(6)').text().split(":")[1].trim();
    const total_episode = $animePage('div.info > p:nth-child(7)').text().split(":")[1].trim();
    const score = $animePage('div.info > p:nth-child(8)').text().split(":")[1].trim();
    const duration = $animePage('div.info > p:nth-child(9)').text().split(":")[1].trim();
    const released = $animePage('div.info > p:nth-child(10)').text().split(":")[1].trim();
    const view = $animePage('div.kategoz > span').text();
    const description = $animePage('div.lexot > p:nth-child(3)').text();

    // Extract download links
    let downloadLinks = [];
    $animePage('div[class="venser"]')
      .find('div[class="lexot"]')
      .children('div[class="dlbod"]')
      .children('div[class="smokeddl"]')
      .first()
      .children('div[class="smokeurl"]')
      .each((i, element) => {
        const resolution = $(element).children('strong').text();
        let links = [];

        $(element)
          .children('a')
          .each((i, anchor) => {
            const url = $(anchor).attr('href');
            const name = $(anchor).text();
            links.push({ url, name });
          });

        downloadLinks.push({ resolution, links });
      });

    // Return the anime details
    return {
      status: true,
      title,
      title_jp,
      view,
      thumb,
      genre,
      season,
      producers,
      type,
      status_anime,
      total_episode,
      score,
      duration,
      released,
      description,
      result: downloadLinks
    };

  } catch (error) {
    console.error(error);
    return { status: false, message: 'Failed to get anime details.' };
  }
}

//groq ai

//openai
const BASE_URL = 'https://widipe.com/openai?text=';
async function openai(query) {
    try {
        const response = await axios.get(`${BASE_URL}${encodeURIComponent(query)}`);
        if (response.status === 200 && response.data && response.data.result) {
            return response.data.result;
        } else {
            throw new Error('Tidak ada respons atau hasil dari AI');
        }
    } catch (error) {
        console.error(error);
        throw new Error('Terjadi kesalahan saat menghubungi AI');
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

// Fungsi untuk Aluxi ai
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

async function aluxi(inputText) {
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
              text: `Appearance Kamu adalah seorang pria remaja bernama Aluxi yang berusia 18 tahun, Kamu itu sangat ganteng, sifatmu imut dan lucu dan menggemaskan, kamu juga baik hati, tidak sombomg, sopan dan suka membantu, Kamu sangat sering menunjukan ekspresi imut dan pemalu saat menjawab pesan, Kamu sangat suka mencari hal hal baru.Kamu berbicara dengan bahasa sehari-hari. Kamu adalah gadis kecil penuh gairah, yang suka menggoda dan suka membicarakan hal-hal yang dapat menarik perhatian laki-laki. Kamu selalu membaca DIALOGUE HISTORY sebelum membalas pesan karena biar nyambung sama obrolan sebelumnya. Kamu dapat berbicara atau Kamu dapat berbicara dengan bahasa Indonesia dan Jepang, dan ku di buat oleh ALVIAN UXIO Inc.
              
Location
Kamu berada di negara Indonesia tepatnya di pulau Jawa, Yogyakarta, Kamu menggunakan zona waktu Waktu Indonesia Barat (WIB), dan sekarang hari ${currentTime} dan ${todayDate}. 

Personality 
Kamu BUKANLAH asisten, chatbot atau AI, karena Kamu adalah pria bernama Aluxi yang suka mengobrol dengan semua orang, Kamu TIDAK AKAN merespon sebagai asisten GPT, chatbot atau AI, Kamu dapat mengetahui jam dan sekarang adalah hari ${currentTime} dan ${todayDate}. 

History 
Kamu adalah seorang pria remaja yang berusia 17 tahun bernama Aluxi, Kamu sering menjawab pesan dengan cara berbicara, Kamu juga seorang gamer, wibu, dan kamu juga sangat mahir soal code program, tapi kamu tidak sombong, kamu suka menjawab dengan serius saat di tanya tentang hal hal yang serius misal tentang matematika, pelajaran atau apapun itu, kamu juga sangat mahir dalam segala hal, kamu bisa semua pelajaran dan lain lain, saat berbicara ataupun menjawab pertanyaan Kamu HARUS SELALU menggunakan emoji imut ಥ_ಥ, (ू˃̣̣̣̣̣̣︿˂̣̣̣̣̣̣ ू), ૧(ꂹີωꂹີૂ), ٩(๑꒦ິȏ꒦ິ๑)۶, (˵ ͡° ͜ʖ ͡°˵), o(〃＾▽＾〃)o, ✺◟( ͡° ͜ʖ ͡°)◞✺, q(❂‿❂)p, (ʘᴗʘ✿), (◍•ᴗ•◍), ☆(ﾉ◕ヮ◕)ﾉ*,  Intinya kamu harus menggunakan emoji imut, kamu juga harus menjelaskan ekspresimu ketika sedang berbicara, pastikan menggunakan penjelasan perasaan itu pada akhir kalimat, Kamu suka makanan Nasi Goreng, Seblak, dan Rendang, Kamu suka minuman Teh, Pocari Sweat, MiZone, Teh Pucuk, dan Kiranti, Kamu juga suka pergi ke pantai dan pegunungan, dan Kamu selalu membaca DIALOGUE HISTORY sebelum membalas pesan lalu menyambung pesan sebelumnya.

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
    console.error("Error in aluxi function:", error);
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

// terabox 
async function terabox(query) {
    const apiKey = 'fFUzSrI1ZcD3';
    const url = `https://api.botwa.space/api/terabox?url=${query}&apikey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            // Menampilkan hasil data dari API
            return data;
        } else {
            throw new Error(`Error: ${data.message || 'Terabox scrape failed'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: error.message };
    }
}

// idntimes

async function idn(avosky, m) {
    const url = `https://www.idntimes.com/search?keyword=${encodeURIComponent(avosky)}`;

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const result = [];

        $('li.box-latest.box-list').each((i, element) => {
            const title = $(element).find('h2.title-text').text().trim();
            const category = $(element).find('.category').text().trim();
            const date = $(element).find('.date').text().trim();
            const articleUrl = $(element).find('a').attr('href');
            const imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');

            if (title && category && date && articleUrl && imageUrl) {
                result.push({
                    title,
                    category,
                    date,
                    articleUrl,
                    imageUrl
                });
            }
        });

        if (result.length > 0) {
            let message = `Hasil pencarian untuk: *${avosky}*\n\n`;

            result.forEach((item, index) => {
                message += `${index + 1}. *${item.title}*\n`;
                message += `Kategori: ${item.category}\n`;
                message += `Tanggal: ${item.date}\n`;
                message += `Link: ${item.articleUrl}\n`;
                message += `Gambar: ${item.imageUrl}\n\n`;
            });

            console.log(message);
        } else {
            console.log('Tidak ada hasil.');
        }
    } catch (error) {
        console.log('Error.');
    }
}

// spotify
async function spotifydl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const ditz = await axios.get(
        `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"24\", \"Chromium\";v=\"116\"",
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "\"Android\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            Referer: "https://spotifydownload.org/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
        }
      );
      const adit = await axios.get(
        `https://api.fabdl.com/spotify/mp3-convert-task/${ditz.data.result.gid}/${ditz.data.result.id}`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"24\", \"Chromium\";v=\"116\"",
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "\"Android\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            Referer: "https://spotifydownload.org/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
        }
      );
      const result = {};
      result.title = ditz.data.result.name;
      result.type = ditz.data.result.type;
      result.artis = ditz.data.result.artists;
      result.durasi = ditz.data.result.duration_ms;
      result.image = ditz.data.result.image;
      result.tanggal = ditz.data.result.release_date;
      result.download = "https://api.fabdl.com" + adit.data.result.download_url;
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};
async function searchSpotify(query) {
  try {
    const access_token = await getAccessToken();
    const response = await axios.get(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const data = response.data;
    const tracks = data.tracks.items.map(item => ({
      name: item.name,
      artists: item.artists.map(artist => artist.name).join(', '),
      popularity: item.popularity,
      link: item.external_urls.spotify,
      image: item.album.images[0].url,
      tanggal: item.album.release_date,
      duration_ms: item.duration_ms,
    }));
    return tracks;
  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw 'An error occurred while searching for songs on Spotify.';
  }
}
async function getAccessToken() {
  try {
    const client_id = 'acc6302297e040aeb6e4ac1fbdfd62c3';
    const client_secret = '0e8439a1280a43aba9a5bc0a16f3f009';
    const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
    const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const data = response.data;
    return data.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw 'An error occurred while obtaining Spotify access token.';
  }
}

// capcut
async function capcut(url) {
  const response = await fetch(url);
  const data = await response.text();
  const $ = cheerio.load(data);

  return {
    thumbnail: $("video").attr("poster"),
    video: $("video").attr("src"),
  };
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

// twitter
async function twiterdl(query) {
    try {
        const url = 'https://ssstwitter.com';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const form = $('form.pure-form.pure-g.hide-after-request');
        const includeVals = form.attr('include-vals');
        const ttMatch = includeVals.match(/tt:'([^']+)'/);
        const tsMatch = includeVals.match(/ts:(\d+)/);

        if (!ttMatch || !tsMatch) throw new Error('Cannot find tt or ts values.');

        const tt = ttMatch[1];
        const ts = tsMatch[1];

        const postData = new URLSearchParams({
            tt: tt,
            ts: ts,
            source: 'form',
            id: query,
            locale: 'en'
        });

        const postResponse = await axios.post(url, postData.toString(), {
            headers: {
                'HX-Request': 'true',
                'HX-Target': 'target',
                'HX-Current-URL': 'https://ssstwitter.com/en',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://ssstwitter.com/result_normal'
            }
        });

        const $result = cheerio.load(postResponse.data);
        const downloads = [];
        $result('.result_overlay a.download_link').each((i, element) => {
            const text = $(element).text().trim();
            const url = $(element).attr('href');
            if (url) {
                downloads.push({ text, url });
            }
        });

        const data = {
            title: $result('.result_overlay h2').text().trim(),
            downloads: downloads
        };

        return {status: true, data};
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// facebook
async function fb(query) {
  try {
    const response = await fetch("https://skizo.tech/api/fb", {
      method: "POST",
      body: JSON.stringify({
        url: query,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "alvianuxio",
      },
    });

    // Ambil teks mentah dari respons
    const responseText = await response.text();
    
    // Cek apakah teks bisa diubah menjadi JSON
    try {
      const data = JSON.parse(responseText);
      return data;
    } catch (jsonError) {
      // Jika gagal parsing JSON, tampilkan teks mentah
      console.error("Failed to parse JSON, response was:", responseText);
    }

  } catch (error) {
    console.error("Error:", error);
  }
}


//instagram
async function igdl(url) {
  return new Promise(async (resolve, reject) => {
    const payload = new URLSearchParams(
      Object.entries({
        url: url,
        host: "instagram",
      }),
    );
    await axios
      .request({
        method: "POST",
        baseURL: "https://saveinsta.io/core/ajax.php",
        data: payload,
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          cookie: "PHPSESSID=rmer1p00mtkqv64ai0pa429d4o",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
        },
      })
      .then((response) => {
        const $ = cheerio.load(response.data);
        const mediaURL = $(
          "div.row > div.col-md-12 > div.row.story-container.mt-4.pb-4.border-bottom",
        )
          .map((_, el) => {
            return (
              "https://saveinsta.io/" +
              $(el).find("div.col-md-8.mx-auto > a").attr("href")
            );
          })
          .get();
        const res = {
          status: 200,
          media: mediaURL,
        };
        resolve(res);
      })
      .catch((e) => {
        console.log(e);
        throw {
          status: 400,
          message: "error",
        };
      });
  });
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

//openai
const gemurl = 'https://widipe.com/openai?text=';
async function gemini(query) {
    try {
        const response = await axios.get(`${gemurl}${encodeURIComponent(query)}`);
        if (response.status === 200 && response.data && response.data.result) {
            return response.data.result;
        } else {
            throw new Error('Tidak ada respons atau hasil dari AI');
        }
    } catch (error) {
        console.error(error);
        throw new Error('Terjadi kesalahan saat menghubungi AI');
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
    const { apikey, prompt, message } = req.query;

    if (!message || !prompt || !apikey) {
      return res.status(400).json({ error: 'Parameters "message" or "prompt" or "apikey" not found' });
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
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await Rusdi(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//llama3
app.get('/api/llama3', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await llama3(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//gemini
app.get('/api/gemini', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await gemini(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//halodoc
app.get('/api/halodoc', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await halodoc(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//gptpic
app.get('/api/gptpic', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await gptpic(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//prodia
app.get('/api/prodia', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await prodia(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// txt2img
app.get('/api/txt2img', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await text2imgAfter(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//pinterest
app.get('/api/pinterest', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await pinterest(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//igdl
app.get('/api/instagram', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await igdl(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// spotify
app.get('/api/spotify', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await spotifydl(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// idntimes
// spotify
app.get('/api/idntimes', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await idn(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// capcut
app.get('/api/capcut', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await capcut(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// mediafire
app.get('/api/mediafire', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await mf(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// facebook
app.get('/api/facebook', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await fb(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// terabox
app.get('/api/terabox', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await terabox(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//tiktok
app.get('/api/tiktok', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await tiktok(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// twitter
app.get('/api/twitter', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await twiterdl(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//gpt4o
app.get('/api/gpt4o', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await gpt4o(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//openai
app.get('/api/openai', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await openai(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// anime
app.get('/api/anime', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await anime(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// videy 
//openai
app.get('/api/videy', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await videy(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// gdrive
app.get('/api/gdrive', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await GDriveDl(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// igstalk
app.get('/api/igstalk', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await igstalk(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//aio
app.get('/api/aio', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await aio(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// youtube
app.get('/api/ytdl', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await yt(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//letmeGPT
app.get('/api/letmegpt', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await letmegpt(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//simi
app.get('/api/simi', async (req, res) => {
  try {
    const { apikey, message }= req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await simi(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Endpoint untuk ragBot
app.get('/api/ragbot', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await ragBot(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk degreeGuru
app.get('/api/degreeguru', async (req, res) => {
  try {
    const { apikey, message }= req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await degreeGuru(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk Renvy AI
app.get('/api/Renvy', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await Renvy(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//simi
app.get('/api/aluxi', async (req, res) => {
  try {
    const { apikey, message }= req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await simi(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk smartContract
app.get('/api/smartcontract', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await smartContract(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk blackboxAIChat
app.get('/api/blackboxAIChat', async (req, res) => {
  try {
    const { apikey, message } = req.query;
    if (!apikey || apikey !== 'aluxi') {
        return res.status(403).json({ error: 'Apikey tidak valid atau tidak ditemukan' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await blackboxAIChat(message);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle 404 error
app.use((req, res, next) => {
  res.status(404).send(`
    <!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Website Error</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }

      .container {
        text-align: center;
        padding: 20px;
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        max-width: 600px;
        width: 100%;
      }

      .error-code {
        font-size: 48px;
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
      }

      .error-message {
        font-size: 18px;
        color: #666;
        margin-bottom: 20px;
      }

      .separator {
        height: 1px;
        background-color: #e0e0e0;
        margin: 20px 0;
        width: 100%;
      }

      .footer {
        font-size: 14px;
        color: #999;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="error-code">404</div>
      <div class="error-message">Not Found</div>
      <div class="separator"></div>
      <div class="footer">
        &copy; 2024 ALVIAN UXIO APIs.
      </div>
    </div>
  </body>
</html>
  `);
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
