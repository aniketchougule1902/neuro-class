(()=>{var e={};e.id=671,e.ids=[671],e.modules={399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7790:e=>{"use strict";e.exports=require("assert")},8893:e=>{"use strict";e.exports=require("buffer")},1282:e=>{"use strict";e.exports=require("child_process")},4770:e=>{"use strict";e.exports=require("crypto")},7702:e=>{"use strict";e.exports=require("events")},2048:e=>{"use strict";e.exports=require("fs")},629:e=>{"use strict";e.exports=require("fs/promises")},2615:e=>{"use strict";e.exports=require("http")},5240:e=>{"use strict";e.exports=require("https")},8216:e=>{"use strict";e.exports=require("net")},9801:e=>{"use strict";e.exports=require("os")},5315:e=>{"use strict";e.exports=require("path")},5816:e=>{"use strict";e.exports=require("process")},6624:e=>{"use strict";e.exports=require("querystring")},6162:e=>{"use strict";e.exports=require("stream")},2452:e=>{"use strict";e.exports=require("tls")},4175:e=>{"use strict";e.exports=require("tty")},7360:e=>{"use strict";e.exports=require("url")},1764:e=>{"use strict";e.exports=require("util")},2623:e=>{"use strict";e.exports=require("worker_threads")},1568:e=>{"use strict";e.exports=require("zlib")},2254:e=>{"use strict";e.exports=require("node:buffer")},7561:e=>{"use strict";e.exports=require("node:fs")},8849:e=>{"use strict";e.exports=require("node:http")},2286:e=>{"use strict";e.exports=require("node:https")},7503:e=>{"use strict";e.exports=require("node:net")},9411:e=>{"use strict";e.exports=require("node:path")},7742:e=>{"use strict";e.exports=require("node:process")},4492:e=>{"use strict";e.exports=require("node:stream")},6402:e=>{"use strict";e.exports=require("node:stream/promises")},2477:e=>{"use strict";e.exports=require("node:stream/web")},3020:e=>{"use strict";e.exports=require("node:url")},7261:e=>{"use strict";e.exports=require("node:util")},5628:e=>{"use strict";e.exports=require("node:zlib")},8359:()=>{},3739:()=>{},6432:(e,t,r)=>{"use strict";r.r(t),r.d(t,{originalPathname:()=>f,patchFetch:()=>g,requestAsyncStorage:()=>m,routeModule:()=>x,serverHooks:()=>h,staticGenerationAsyncStorage:()=>q});var s={};r.r(s),r.d(s,{OPTIONS:()=>d,POST:()=>l});var i=r(9303),o=r(8716),u=r(670),a=r(7070),n=r(8954),p=r(6172);let c=null;async function l(e){try{let{studentAnswerSheet:t,subject:r,studentName:s,analyzedQuestionPaper:i}=await e.json();if(!t||!i)return(0,p.o)(a.NextResponse.json({error:"Missing student answer sheet or reference question paper."},{status:400}));let o=function(){if(!c){let e=process.env.GEMINI_API_KEY;c=new n.fA(e?{apiKey:e,httpOptions:{headers:{"User-Agent":"aistudio-build"}}}:{apiKey:"DEMO_KEY"})}return c}(),u=[],l=`
      You are the Master AI Evaluator for NeuroClass.
      Grade the student's submission against the reference Question Paper.
      Reference Question Paper: ${JSON.stringify(i)}
      Student Name: ${s||"Student"}
      Subject: ${r||"General"}

      Output strictly JSON:
      {
        "totalMarksObtained": 85,
        "totalMarksPossible": 100,
        "percentage": 85,
        "grade": "A",
        "overallFeedback": "Excellent analytical rigor.",
        "strengths": ["Clear step-by-step mathematical proofs"],
        "weaknesses": ["Minor arithmetic slip in final step"],
        "improvementSuggestions": ["Review wave packet boundary conditions"],
        "questionEvaluations": [
          {
            "questionNumber": "Q1",
            "marksAllocated": 10,
            "marksAwarded": 9,
            "feedback": "Great logic.",
            "studentResponseSummary": "Accurate derivation."
          }
        ]
      }
    `;if(t.startsWith("data:image/")){let e=t.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);e&&u.push({inlineData:{mimeType:e[1],data:e[2]}})}else l+=`

--- STUDENT ANSWER SHEET ---
${t}`;u.push({text:l});let d=((await o.models.generateContent({model:"gemini-2.5-flash",contents:{parts:u},config:{responseMimeType:"application/json",temperature:.2}})).text||"{}").trim().replace(/^```json/,"").replace(/```$/,"");return(0,p.o)(a.NextResponse.json(JSON.parse(d)))}catch(e){return console.error("Test Paper Evaluation Error:",e),(0,p.o)(a.NextResponse.json({error:e.message||"Evaluation engine failed."},{status:500}))}}async function d(){return(0,p.A)()}let x=new i.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/evaluate/test-paper/route",pathname:"/api/evaluate/test-paper",filename:"route",bundlePath:"app/api/evaluate/test-paper/route"},resolvedPagePath:"/home/ubuntu/neuro-class/backend/app/api/evaluate/test-paper/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:m,staticGenerationAsyncStorage:q,serverHooks:h}=x,f="/api/evaluate/test-paper/route";function g(){return(0,u.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:q})}},6172:(e,t,r)=>{"use strict";r.d(t,{A:()=>u,o:()=>o});var s=r(7070);let i={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, PUT, DELETE, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization, X-402-Payment-TxId, X-Payment-TxId"};function o(e){return Object.entries(i).forEach(([t,r])=>{e.headers.set(t,r)}),e}function u(){return new s.NextResponse(null,{status:204,headers:i})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[789,180,954],()=>r(6432));module.exports=s})();