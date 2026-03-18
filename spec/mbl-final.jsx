import { useState, useEffect, useRef } from "react";

const C={bg:"#111",card:"#1a1a1a",inp:"#252525",hover:"#2a2a2a",b1:"#2a2a2a",b2:"#363636",t1:"#f2f0ed",t2:"#9a9890",t3:"#5c5b57",acc:"#c9943e",accD:"rgba(201,148,62,0.12)",grn:"#5cb87a",grnD:"rgba(92,184,122,0.1)",red:"#d95757",redD:"rgba(217,87,87,0.1)",blu:"#5b9bd5",bluD:"rgba(91,155,213,0.1)",amb:"#d4a04a",ambD:"rgba(212,160,74,0.1)"};
function B({c,children}){const m={g:[C.grnD,C.grn],r:[C.redD,C.red],b:[C.bluD,C.blu],a:[C.ambD,C.amb],ac:[C.accD,C.acc],x:["rgba(150,148,140,.08)",C.t3]};const[bg,fg]=m[c]||m.x;return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 11px",borderRadius:99,fontSize:11,fontWeight:500,background:bg,color:fg,whiteSpace:"nowrap"}}>{children}</span>;}
function Btn({children,v,onClick,disabled,style:s}){const m={p:{background:C.acc,color:"#1a1a1a",fontWeight:600},s:{background:C.inp,color:C.t1,border:"1px solid "+C.b2},g:{background:"transparent",color:C.t2},d:{background:C.redD,color:C.red}};return <button onClick={onClick} disabled={disabled} style={{padding:"10px 22px",borderRadius:10,fontSize:14,fontWeight:500,cursor:disabled?"not-allowed":"pointer",border:"none",opacity:disabled?.4:1,display:"inline-flex",alignItems:"center",gap:8,...(m[v]||m.p),...s}}>{children}</button>;}
function Tgl({on,onClick,label}){return <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><div style={{width:34,height:18,borderRadius:9,background:on?C.acc:C.b2,position:"relative",flexShrink:0}}><div style={{width:14,height:14,borderRadius:7,background:"#fff",position:"absolute",top:2,left:on?18:2,transition:"left .2s"}}/></div><span style={{fontSize:12,color:on?C.t1:C.t3}}>{label}</span></div>;}
function Inp({label,value,onChange,placeholder,required,half}){return <div style={{flex:half?"1":"auto"}}><div style={{fontSize:12,color:C.t2,marginBottom:5}}>{label}{required&&<span style={{color:C.acc}}> *</span>}</div><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"9px 14px",borderRadius:8,border:"1px solid "+C.b2,background:C.inp,color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.acc} onBlur={e=>e.target.style.borderColor=C.b2}/></div>;}

const FN=["Margaret","Robert","James","Amy","Susan","Ellen","David","Tom","Karen","Patricia","Michael","Jennifer","William","Linda","Richard","Barbara","Joseph","Elizabeth","Thomas","Nancy","Charles","Sandra","Daniel","Betty","Matthew","Dorothy","Anthony","Lisa","Mark","Ashley"];
const LN=["Chen","Fitzgerald","Lopez","Nguyen","Park","Katz","Hernandez","Bradley","Wright","Murray","Sullivan","O'Brien","Johnson","Williams","Brown","Davis","Miller","Wilson","Moore","Taylor"];
const ST=["Oak Hill Rd","Chestnut St","Ward St","Lowell Ave","Walnut Park","Highland Ave","River St","Pearl St","Elm Ct","Watertown St","Centre St","Commonwealth Ave","Beacon St","Washington St","Needham St","Webster St","Dedham St","Crafts St","Lincoln St","Adams Ave"];
const HOODS=[
  {name:"Newton Centre",lat:42.331,lng:-71.192,zip:"02459"},
  {name:"Newton Highlands",lat:42.322,lng:-71.206,zip:"02461"},
  {name:"West Newton",lat:42.35,lng:-71.225,zip:"02465"},
  {name:"Newtonville",lat:42.352,lng:-71.208,zip:"02460"},
  {name:"Waban",lat:42.324,lng:-71.228,zip:"02468"},
  {name:"Auburndale",lat:42.345,lng:-71.245,zip:"02466"},
  {name:"Newton Upper Falls",lat:42.312,lng:-71.205,zip:"02464"},
  {name:"Newton Lower Falls",lat:42.33,lng:-71.16,zip:"02462"},
  {name:"Chestnut Hill",lat:42.318,lng:-71.165,zip:"02467"},
];
function nearestHood(lat,lng){let best=HOODS[0],bd=Infinity;for(const h of HOODS){const d=Math.abs(h.lat-lat)+Math.abs(h.lng-lng);if(d<bd){bd=d;best=h;}}return best;}

const mkOwn=(n=100)=>{const a=[];for(let i=1;i<=n;i++){const r=Math.random();const tp=r<.07?"Investor":r<.5?"Absentee":"Owner";const dnc=Math.random()<.04;const yr=Math.floor(Math.random()*25)+1;const eq=Math.min(95,Math.floor(yr*3.5+Math.random()*20));
const lat=42.305+Math.random()*0.055;const lng=-71.22+Math.random()*0.065;
const hood=nearestHood(lat,lng);
a.push({id:i,name:tp==="Investor"?["Apex","Summit","Harbor","Metro","Prime"][i%5]+" Realty "+["Trust","LLC","Group","Holdings","Partners"][i%5]:FN[i%FN.length]+" "+LN[i%LN.length],addr:(10+Math.floor(Math.random()*490))+" "+ST[i%ST.length],city:"Newton",neighborhood:hood.name,zip:hood.zip,val:400+Math.round(Math.random()*250),bd:Math.random()>.4?3:4,ba:Math.random()>.5?2:2.5,sqft:1200+Math.floor(Math.random()*1200),eq,yr,lat,lng,type:tp,ok:!dnc,dnc,verified:Math.random()>.05,del:null});}return a;};

// Seed campaign data
const SEED_CAMPS=[
  {id:"c1",buyer:"Sarah M.",area:"Newton",price:"$400K\u2013$600K",date:"Mar 14",ago:"3d ago",sent:92,delivered:87,transit:3,returned:2,status:"Delivered",cost:103.04,tmpl:"Warm + Personal",owners:mkOwn(92).map((o,i)=>({...o,del:i<87?"Delivered":i<90?"In transit":"Returned"}))},
  {id:"c2",buyer:"Michael R.",area:"Somerville",price:"$250K\u2013$350K",date:"Mar 12",ago:"5d ago",sent:78,delivered:74,transit:1,returned:3,status:"Delivered",cost:87.36,tmpl:"Straight to the Point",owners:mkOwn(78).map((o,i)=>({...o,del:i<74?"Delivered":i<75?"In transit":"Returned"}))},
  {id:"c3",buyer:"David K.",area:"Brookline",price:"$800K\u2013$1.2M",date:"Mar 10",ago:"7d ago",sent:45,delivered:43,transit:0,returned:2,status:"Delivered",cost:50.40,tmpl:"Luxury",owners:mkOwn(45).map((o,i)=>({...o,del:i<43?"Delivered":"Returned"}))},
  {id:"c4",buyer:"Jennifer W.",area:"Wellesley",price:"$550K\u2013$750K",date:"Mar 8",ago:"9d ago",sent:100,delivered:96,transit:0,returned:4,status:"Delivered",cost:112.00,tmpl:"Warm + Personal",owners:mkOwn(100).map((o,i)=>({...o,del:i<96?"Delivered":"Returned"}))},
];

const TEMPLATES=[{id:"tmpl_warm_v1",name:"Warm + Personal"},{id:"tmpl_direct_v1",name:"Straight to the Point"},{id:"tmpl_luxury_v1",name:"Luxury"}];

function Hills(){return <svg viewBox="0 0 600 90" style={{width:"55%",height:"auto",display:"block",margin:"0 auto 5%"}}><rect width="600" height="90" fill="#7EC8E3" rx="8"/><ellipse cx="80" cy="90" rx="130" ry="38" fill="#5B8C3E"/><ellipse cx="300" cy="90" rx="180" ry="52" fill="#4A7A2E"/><ellipse cx="520" cy="90" rx="130" ry="32" fill="#6B9E4A"/><circle cx="110" cy="46" r="13" fill="#3A6A1E"/><rect x="109" y="46" width="2.5" height="16" fill="#5A4030" rx="1"/><circle cx="132" cy="40" r="16" fill="#4A7A2E"/><rect x="131" y="40" width="2.5" height="18" fill="#5A4030" rx="1"/><circle cx="460" cy="52" r="11" fill="#3A6A1E"/><rect x="459" y="52" width="2.5" height="14" fill="#5A4030" rx="1"/><circle cx="485" cy="46" r="14" fill="#4A7A2E"/><rect x="484" y="46" width="2.5" height="17" fill="#5A4030" rx="1"/></svg>;}

// ═══ DASHBOARD ═══
function Dashboard({campaigns,onNew,onView,onDuplicate,onDelete}){
  const ts=campaigns.reduce((a,c)=>a+c.sent,0);
  const td=campaigns.reduce((a,c)=>a+c.delivered,0);
  const tc=campaigns.reduce((a,c)=>a+c.cost,0);
  const[filter,setFilter]=useState("all");
  const filtered=filter==="all"?campaigns:campaigns.filter(c=>c.status.toLowerCase()===filter);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
      <div><h1 style={{fontSize:26,fontWeight:600,color:C.t1,margin:"0 0 6px"}}>Magic Buyer Letters</h1><p style={{fontSize:14,color:C.t2,margin:0}}>Your campaigns and delivery tracking</p></div>
      <Btn onClick={onNew} style={{padding:"10px 24px",fontSize:14}}>+ New Letter</Btn>
    </div>

    {/* Stats */}
    <div style={{display:"flex",gap:14,marginBottom:24}}>
      {[["Campaigns",campaigns.length,C.t1],["Letters sent",ts,C.blu],["Delivered",td,C.grn],["Total spend","$"+tc.toFixed(0),C.acc]].map(([l,v,c])=>
        <div key={l} style={{flex:1,background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"16px 20px"}}><div style={{fontSize:12,color:C.t3,marginBottom:6}}>{l}</div><div style={{fontSize:22,fontWeight:600,color:c}}>{v}</div></div>
      )}
    </div>

    {/* Filter bar */}
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      {[["all","All ("+campaigns.length+")"],["delivered","Delivered"],["sent","Sent"],["sending","Sending"]].map(([k,l])=>
        <button key={k} onClick={()=>setFilter(k)} style={{padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",border:filter===k?"1px solid "+C.b1:"1px solid transparent",background:filter===k?C.card:"transparent",color:filter===k?C.t1:C.t3}}>{l}</button>
      )}
    </div>

    {/* Campaign list */}
    {campaigns.length===0?
      <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:14,padding:"72px 32px",textAlign:"center"}}>
        <div style={{fontSize:17,color:C.t2,marginBottom:10}}>No campaigns yet</div>
        <p style={{fontSize:14,color:C.t3,margin:"0 0 20px"}}>Create your first Magic Buyer Letter to get started.</p>
        <Btn onClick={onNew} style={{padding:"11px 28px"}}>+ New Letter</Btn>
      </div>
    :
      <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid "+C.b1}}>
            {["Buyer","Area","Template","Sent","Delivered","Returned","Status","Cost",""].map(h=>
              <th key={h} style={{padding:"12px 18px",fontSize:11,fontWeight:500,color:C.t3,textAlign:"left",textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>
            )}
          </tr></thead>
          <tbody>{filtered.map((c,i)=>
            <tr key={c.id} style={{borderBottom:i<filtered.length-1?"1px solid "+C.b1:"none",cursor:"pointer"}} onClick={()=>onView(c)} onMouseEnter={e=>e.currentTarget.style.background=C.hover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{padding:"14px 18px"}}><div style={{fontSize:14,fontWeight:500,color:C.t1}}>{c.buyer}</div><div style={{fontSize:11,color:C.t3,marginTop:2}}>{c.ago}</div></td>
              <td style={{padding:"14px 18px",fontSize:13,color:C.t2}}>{c.area}</td>
              <td style={{padding:"14px 18px",fontSize:12,color:C.t3}}>{c.tmpl}</td>
              <td style={{padding:"14px 18px",fontSize:14,color:C.t1}}>{c.sent}</td>
              <td style={{padding:"14px 18px",fontSize:14,color:C.grn}}>{c.delivered}</td>
              <td style={{padding:"14px 18px",fontSize:14,color:c.returned>0?C.red:C.t3}}>{c.returned}</td>
              <td style={{padding:"14px 18px"}}><B c={c.status==="Delivered"?"g":c.status==="Sent"?"b":"a"}>{c.status}</B></td>
              <td style={{padding:"14px 18px",fontSize:13,color:C.t2}}>${c.cost.toFixed(0)}</td>
              <td style={{padding:"14px 18px"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></td>
            </tr>
          )}</tbody>
        </table>
      </div>
    }
  </div>;
}

// ═══ CAMPAIGN DETAIL ═══
function CampaignDetail({campaign,onBack,onDuplicate,onDelete}){
  const[tab,setTab]=useState("recipients");
  const[confirm,setConfirm]=useState(false);
  const owners=campaign.owners||[];
  const delivered=owners.filter(o=>o.del==="Delivered").length;
  const transit=owners.filter(o=>o.del==="In transit").length;
  const returned=owners.filter(o=>o.del==="Returned").length;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
      <div>
        <button onClick={onBack} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:12,padding:0,marginBottom:6,display:"block"}}>{"\u2190"} All campaigns</button>
        <h2 style={{fontSize:22,fontWeight:500,color:C.t1,margin:"0 0 6px"}}>{campaign.buyer} {"\u00b7"} {campaign.area}</h2>
        <p style={{fontSize:13,color:C.t2,margin:0}}>{campaign.price} {"\u00b7"} {campaign.tmpl} {"\u00b7"} {campaign.date}</p>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn v="s" onClick={()=>onDuplicate(campaign)} style={{padding:"8px 16px",fontSize:12}}>Duplicate</Btn>
        <Btn v="s" onClick={()=>{/* TODO: downloadContacts(campaign.id) */}} style={{padding:"8px 16px",fontSize:12}}>Export CSV</Btn>
        {!confirm?<Btn v="d" onClick={()=>setConfirm(true)} style={{padding:"8px 16px",fontSize:12}}>Delete</Btn>:
        <Btn v="d" onClick={()=>onDelete(campaign.id)} style={{padding:"8px 16px",fontSize:12}}>Confirm delete</Btn>}
      </div>
    </div>

    {/* Stats row */}
    <div style={{display:"flex",gap:12,marginBottom:20}}>
      {[["Sent",campaign.sent,C.blu],["Delivered",delivered,C.grn],["In transit",transit,C.amb],["Returned",returned,C.red],["Cost","$"+campaign.cost.toFixed(0),C.acc]].map(([l,v,c])=>
        <div key={l} style={{flex:1,background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"14px 18px"}}><div style={{fontSize:11,color:C.t3,marginBottom:4}}>{l}</div><div style={{fontSize:20,fontWeight:600,color:c}}>{v}</div></div>
      )}
    </div>

    {/* Delivery pipeline */}
    <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"18px 24px",marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:500,color:C.t1,marginBottom:12}}>Delivery pipeline</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {[["Printed",campaign.sent,C.t2],["In transit",transit,C.amb],["Delivered",delivered,C.grn],["Returned",returned,C.red]].map(([l,v,c],i)=>
          <div key={l} style={{display:"flex",alignItems:"center",flex:1}}>
            <div style={{flex:1,textAlign:"center",padding:"8px 0"}}><div style={{fontSize:18,fontWeight:600,color:c}}>{v}</div><div style={{fontSize:11,color:C.t3,marginTop:2}}>{l}</div></div>
            {i<3&&<div style={{color:C.t3,fontSize:10,flexShrink:0}}>{"\u2192"}</div>}
          </div>
        )}
      </div>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      {[["recipients","Recipients ("+owners.length+")"],["tracking","Delivery tracking"],["lob","Lob details"]].map(([k,l])=>
        <button key={k} onClick={()=>setTab(k)} style={{padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",border:tab===k?"1px solid "+C.b1:"1px solid transparent",background:tab===k?C.card:"transparent",color:tab===k?C.t1:C.t3}}>{l}</button>
      )}
    </div>

    {tab==="recipients"&&<div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,overflow:"hidden"}}>
      <div style={{maxHeight:420,overflowY:"auto"}}>
      {owners.map((o,i)=>{const dc={Delivered:[C.grn,C.grnD],"In transit":[C.amb,C.ambD],Returned:[C.red,C.redD]};const[fc,bc]=dc[o.del]||[C.t3,"rgba(150,148,140,.08)"];
        return <div key={o.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 20px",borderBottom:i<owners.length-1?"1px solid "+C.b1:"none"}} onMouseEnter={e=>e.currentTarget.style.background=C.hover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{flex:1}}><span style={{fontSize:13,fontWeight:500,color:C.t1}}>{o.name}</span><div style={{fontSize:11,color:C.t3,marginTop:2}}>{o.addr}, {o.neighborhood||o.city} {o.zip||""} {"\u00b7"} ${o.val}K {"\u00b7"} {o.bd}/{o.ba} {"\u00b7"} {o.sqft?o.sqft.toLocaleString()+"sf":""} {"\u00b7"} {o.eq||0}% eq {"\u00b7"} {o.yr||0}yr</div></div>
          <B c={o.type==="Absentee"?"a":o.type==="Investor"?"b":"x"}>{o.type}</B>
          {o.del&&<span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:500,background:bc,color:fc}}>{o.del}</span>}
        </div>;
      })}
      </div>
    </div>}

    {tab==="tracking"&&<div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,overflow:"hidden"}}>
      <div style={{maxHeight:420,overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid "+C.b1}}>{["Owner","Address","Status","Lob ID","Expected delivery"].map(h=><th key={h} style={{padding:"12px 18px",fontSize:11,fontWeight:500,color:C.t3,textAlign:"left",textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>)}</tr></thead>
          <tbody>{owners.filter(o=>o.del).map((o,i)=>{
            const dc={Delivered:"g","In transit":"a",Returned:"r"};
            return <tr key={o.id} style={{borderBottom:i<owners.length-2?"1px solid "+C.b1:"none"}}>
              <td style={{padding:"12px 18px",fontSize:13,color:C.t1}}>{o.name}</td>
              <td style={{padding:"12px 18px",fontSize:12,color:C.t2}}>{o.addr}</td>
              <td style={{padding:"12px 18px"}}><B c={dc[o.del]||"x"}>{o.del}</B></td>
              <td style={{padding:"12px 18px",fontSize:11,color:C.t3,fontFamily:"monospace"}}>ltr_{String(o.id).padStart(3,"0")}a8f</td>
              <td style={{padding:"12px 18px",fontSize:12,color:C.t3}}>Mar 21, 2026</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>}

    {tab==="lob"&&<div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"24px 28px"}}>
      <div style={{fontSize:14,fontWeight:500,color:C.t1,marginBottom:16}}>Lob API details</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[["Template ID","tmpl_warm_v1"],["Mail type","usps_first_class"],["Color","true"],["Double-sided","false"],["Address placement","top_first_page"],["Envelope","Standard #10 double-window"],["Cancellation window","4 hours (expired)"],["Webhook events","6 registered"]].map(([l,v])=>
          <div key={l} style={{padding:"12px 16px",background:C.inp,borderRadius:10}}><div style={{fontSize:11,color:C.t3,marginBottom:3}}>{l}</div><div style={{fontSize:13,color:C.t1,fontFamily:v.startsWith("tmpl")?"monospace":"inherit"}}>{v}</div></div>
        )}
      </div>
      <div style={{marginTop:16,padding:"14px 16px",background:C.inp,borderRadius:10}}>
        <div style={{fontSize:12,color:C.t3,marginBottom:8}}>Webhook history (last 5)</div>
        {["letter.delivered \u00b7 ltr_087a8f \u00b7 Mar 19","letter.delivered \u00b7 ltr_086a8f \u00b7 Mar 19","letter.in_transit \u00b7 ltr_090a8f \u00b7 Mar 18","letter.rendered_pdf \u00b7 ltr_092a8f \u00b7 Mar 15","letter.created \u00b7 ltr_001a8f \u00b7 Mar 14"].map((e,i)=>
          <div key={i} style={{fontSize:11,color:C.t2,fontFamily:"monospace",padding:"4px 0"}}>{e}</div>
        )}
      </div>
    </div>}
  </div>;
}

// ═══ AGENT SETUP ═══
function AgentSetup({onComplete,initial}){
  const[f,setF]=useState(initial||{name:"",brokerage:"",phone:"",email:"",addr:"",city:"",state:"",zip:"",license:"",website:"",headshot:null,logo:null});
  const[saving,setSaving]=useState(false);const u=(k,v)=>setF(p=>({...p,[k]:v}));const valid=f.name&&f.brokerage&&f.phone&&f.addr&&f.city&&f.state&&f.zip;
  const save=async()=>{setSaving(true);await new Promise(r=>setTimeout(r,1200));onComplete({...f,lob_address_id:f.lob_address_id||"adr_"+Math.random().toString(36).slice(2,14)});};

  function FileUpload({label,field,accept,hint}){
    const ref=useRef(null);
    const hasFile=f[field];
    return <div style={{flex:1}}>
      <div style={{fontSize:12,color:C.t2,marginBottom:5}}>{label}</div>
      <div onClick={()=>ref.current?.click()} style={{border:"1px dashed "+(hasFile?C.acc:C.b2),borderRadius:10,padding:"14px 16px",cursor:"pointer",background:hasFile?C.accD:C.inp,display:"flex",alignItems:"center",gap:10,transition:"all .15s"}} onMouseEnter={e=>{if(!hasFile)e.currentTarget.style.borderColor=C.acc;}} onMouseLeave={e=>{if(!hasFile)e.currentTarget.style.borderColor=C.b2;}}>
        {hasFile?<>
          <div style={{width:36,height:36,borderRadius:field==="headshot"?"50%":6,background:C.inp,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
            <img src={hasFile} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
          </div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:C.t1,fontWeight:500}}>Uploaded</div><button onClick={e=>{e.stopPropagation();u(field,null);}} style={{background:"none",border:"none",color:C.red,fontSize:11,cursor:"pointer",padding:0}}>Remove</button></div>
        </>:<>
          <div style={{width:36,height:36,borderRadius:field==="headshot"?"50%":6,background:C.hover,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
          <div style={{flex:1}}><div style={{fontSize:13,color:C.t2}}>Click to upload</div><div style={{fontSize:11,color:C.t3}}>{hint}</div></div>
        </>}
        <input ref={ref} type="file" accept={accept} style={{display:"none"}} onChange={e=>{const file=e.target.files?.[0];if(file){const reader=new FileReader();reader.onload=ev=>u(field,ev.target.result);reader.readAsDataURL(file);}}}/>
      </div>
    </div>;
  }

  return <div style={{maxWidth:600,margin:"0 auto"}}>
    <button onClick={()=>onComplete(f)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:12,padding:0,marginBottom:6,display:"block"}}>{"\u2190"} Back to dashboard</button>
    <div style={{marginBottom:28}}><h1 style={{fontSize:26,fontWeight:600,color:C.t1,margin:"0 0 8px"}}>Settings</h1><p style={{fontSize:14,color:C.t2,margin:0}}>Your info for the letters and envelope. All fields optional except name, brokerage, phone, and return address.</p></div>
    <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:14,padding:"28px 32px"}}>

      {/* Identity */}
      <div style={{display:"flex",gap:14,marginBottom:16}}>
        <Inp label="Full name" value={f.name} onChange={v=>u("name",v)} placeholder="Jimmy Mackin" required half/>
        <Inp label="Brokerage" value={f.brokerage} onChange={v=>u("brokerage",v)} placeholder="Mackin Realty" required half/>
      </div>
      <div style={{display:"flex",gap:14,marginBottom:16}}>
        <Inp label="Phone" value={f.phone} onChange={v=>u("phone",v)} placeholder="(617) 921-5263" required half/>
        <Inp label="Email" value={f.email} onChange={v=>u("email",v)} placeholder="jimmy@example.com" half/>
      </div>
      <div style={{display:"flex",gap:14,marginBottom:20}}>
        <Inp label="Website" value={f.website} onChange={v=>u("website",v)} placeholder="listingleads.com" half/>
        <Inp label="License #" value={f.license} onChange={v=>u("license",v)} placeholder="Optional" half/>
      </div>

      {/* Branding */}
      <div style={{fontSize:12,color:C.t2,marginBottom:10,fontWeight:500}}>Branding <span style={{fontWeight:400,color:C.t3}}>(used in letter signature block)</span></div>
      <div style={{display:"flex",gap:14,marginBottom:24}}>
        <FileUpload label="Headshot" field="headshot" accept="image/*" hint="Square, 400px+"/>
        <FileUpload label="Brokerage logo" field="logo" accept="image/*" hint="PNG with transparency"/>
      </div>

      {/* Return address */}
      <div style={{fontSize:12,color:C.t2,marginBottom:10,fontWeight:500}}>Return address <span style={{fontWeight:400,color:C.t3}}>(printed on envelope)</span></div>
      <div style={{marginBottom:14}}><Inp label="Street" value={f.addr} onChange={v=>u("addr",v)} placeholder="123 Main St" required/></div>
      <div style={{display:"flex",gap:14,marginBottom:24}}>
        <Inp label="City" value={f.city} onChange={v=>u("city",v)} placeholder="Boston" required half/>
        <Inp label="State" value={f.state} onChange={v=>u("state",v)} placeholder="MA" required half/>
        <Inp label="ZIP" value={f.zip} onChange={v=>u("zip",v)} placeholder="02101" required half/>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn onClick={save} disabled={!valid||saving} style={{padding:"11px 28px"}}>{saving?"Saving...":"Save changes"}</Btn>
      </div>
    </div>
  </div>;
}

// ═══ DESCRIBE BUYER ═══
function DescribeBuyer({onGo,onBack}){
  const[inp,setInp]=useState("");const[foc,setFoc]=useState(false);const[vc,setVc]=useState("off");const[bars,setBars]=useState([]);const ref=useRef(null);const iv=useRef(null);
  const[step,setStep]=useState("input"); // "input" or "details"
  const[details,setDetails]=useState({financing:"pre-approved",closing:"flexible",condition:"minor-updates",extra:""});
  const areas=["Newton","Brookline","Somerville","Cambridge","Watertown","Wellesley"];
  function parse(t){if(!t.trim())return null;const r={};const n=t.match(/^([A-Z][a-z]+(?:\s*[&]\s*[A-Z][a-z]+)?)/);if(n)r.name=n[1];const p=t.match(/\$?([\d,.]+)[kK]?\s*[-\u2013to]+\s*\$?([\d,.]+)[kK]?/);if(p){let a=parseInt(p[1].replace(/,/g,"")),b=parseInt(p[2].replace(/,/g,""));if(a<10000)a*=1000;if(b<10000)b*=1000;r.price="$"+(a/1000)+"K\u2013$"+(b/1000)+"K";}const bd=t.match(/(\d)\s*(?:bed|bd|br)/i);if(bd)r.beds=bd[1];const ba=t.match(/([\d.]+)\s*(?:bath|ba)/i);if(ba)r.baths=ba[1];for(const a of areas)if(t.toLowerCase().includes(a.toLowerCase()))r.area=a;const z=t.match(/\b(\d{5})\b/);if(z)r.zip=z[1];const tg=[];if(/pre.?approved/i.test(t))tg.push("Pre-approved");if(/cash/i.test(t)){tg.push("Cash");r.financing="cash";}if(tg.length)r.tags=tg;return Object.keys(r).length>1?r:null;}
  function mic(){setVc("rec");setInp("");iv.current=setInterval(()=>setBars(Array.from({length:24},()=>4+Math.random()*18)),120);setTimeout(()=>done(),3000);}
  function done(){clearInterval(iv.current);setVc("typ");const tx="Sarah, $400-600K, 3 bed 2 bath, Newton, pre-approved";let ci=0;const ti=setInterval(()=>{ci+=2;setInp(tx.slice(0,ci));if(ci>=tx.length){clearInterval(ti);setVc("off");}},35);}
  useEffect(()=>()=>clearInterval(iv.current),[]);
  const parsed=parse(inp);const miss=[];if(parsed){if(!parsed.name)miss.push("Buyer name");if(!parsed.price)miss.push("Price range");if(!parsed.area&&!parsed.zip)miss.push("Area or ZIP");}const ready=parsed&&miss.length===0;

  const finMap={["pre-approved"]:"Pre-approved up to ",cash:"Cash buyer \u2014 no financing contingency",fha:"FHA buyer \u2014 pre-approved up to ",va:"VA buyer \u2014 pre-approved up to ",conventional:"Conventionally financed up to "};
  const closeMap={flexible:"Flexible on closing \u2014 whatever works best for you",quick:"Can close in as little as 21 days","30":"Targeting a 30-day close","60":"Flexible timeline \u2014 no rush",rent:"Open to rent-back if you need time"};
  const condMap={["minor-updates"]:"Comfortable with homes needing minor updates",["as-is"]:"Willing to buy as-is \u2014 no repair requests",pristine:"Looking for move-in ready",renovation:"Open to homes needing significant work"};

  const getBullets=()=>{
    const b1=finMap[details.financing]||finMap["pre-approved"];
    const needsPrice=!b1.includes("Cash");
    const b1Full=needsPrice?b1+(parsed?.price||"$600,000"):b1;
    const b2=closeMap[details.closing]||closeMap.flexible;
    const b3=condMap[details.condition]||condMap["minor-updates"];
    return [b1Full,b2,b3];
  };

  const handleGenerate=()=>{
    const bullets=getBullets();
    onGo({...parsed,bullets,details});
  };

  return <div>
    <style>{`@keyframes pr{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.8);opacity:0}}@keyframes gp{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
      <div><button onClick={step==="details"?()=>setStep("input"):onBack} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:12,padding:0,marginBottom:6,display:"block"}}>{"\u2190"} {step==="details"?"Back":"Dashboard"}</button><h1 style={{fontSize:26,fontWeight:600,color:C.t1,margin:0}}>New Magic Buyer Letter</h1></div>
      {step==="details"&&<Btn onClick={handleGenerate} style={{padding:"10px 24px",fontSize:14,flexShrink:0}}>Generate Letters {"\u2192"}</Btn>}
    </div>

    {step==="input"&&<div style={{maxWidth:660,margin:"0 auto"}}>
      {vc==="rec"&&<div style={{background:C.card,border:"2px solid "+C.acc,borderRadius:14,padding:"18px 20px",marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{position:"relative",width:10,height:10}}><div style={{position:"absolute",inset:-3,borderRadius:"50%",background:C.red,animation:"pr 1.2s ease-out infinite"}}/><div style={{width:10,height:10,borderRadius:"50%",background:C.red,position:"relative"}}/></div><span style={{fontSize:14,fontWeight:500,color:C.t1}}>Listening...</span></div><button onClick={done} style={{padding:"5px 14px",borderRadius:6,border:"1px solid "+C.red,background:C.redD,color:C.red,fontSize:12,fontWeight:500,cursor:"pointer"}}>Done</button></div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:2,height:32}}>{bars.map((h,i)=><div key={i} style={{width:2.5,borderRadius:2,background:C.acc,height:h,transition:"height .1s"}}/>)}</div></div>}
      {vc==="typ"&&<div style={{background:C.card,border:"2px solid "+C.acc,borderRadius:14,padding:"18px 20px",marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:10,height:10,borderRadius:"50%",background:C.acc,animation:"gp 1s ease-in-out infinite"}}/><span style={{fontSize:14,fontWeight:500,color:C.t1}}>Transcribing...</span></div><div style={{background:C.inp,borderRadius:8,padding:"10px 14px",fontSize:15,color:C.t1,fontStyle:"italic"}}>{inp||"..."}</div></div>}
      {vc==="off"&&<div>
        <div style={{border:"2px solid "+(foc?C.acc:C.b2),borderRadius:14,padding:"14px 18px",background:C.card,transition:"border-color .2s"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16,opacity:.4}}>{"\u2709"}</span><input ref={ref} value={inp} onChange={e=>setInp(e.target.value)} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} onKeyDown={e=>{if(e.key==="Enter"&&ready)setStep("details");}} placeholder="Sarah, $400-600K, 3 bed 2 bath, Newton, pre-approved" style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:16}}/><button onClick={mic} style={{width:36,height:36,borderRadius:"50%",border:"1.5px solid "+C.b2,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.acc} onMouseLeave={e=>e.currentTarget.style.borderColor=C.b2}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.t2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button><Btn onClick={()=>ready&&setStep("details")} disabled={!ready} style={{padding:"8px 18px",fontSize:13,borderRadius:10}}>Next</Btn></div></div>
        {parsed&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10,justifyContent:"center"}}>{parsed.name&&<B c="ac">{parsed.name}</B>}{parsed.price&&<B c="g">{parsed.price}</B>}{parsed.beds&&<B c="b">{parsed.beds}bd{parsed.baths?"/"+parsed.baths+"ba":""}</B>}{parsed.area&&<B c="a">{parsed.area}</B>}{parsed.zip&&<B c="a">ZIP {parsed.zip}</B>}{parsed.tags?.map(t=><B key={t} c="ac">{t}</B>)}</div>}
        {parsed&&miss.length>0&&<div style={{marginTop:10,padding:"10px 16px",background:C.ambD,borderRadius:10,border:"1px solid rgba(212,160,74,.2)",textAlign:"center"}}><span style={{fontSize:13,color:C.amb}}>Still need: <strong>{miss.join(", ")}</strong></span></div>}
        {!inp&&<div style={{marginTop:16}}><div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"16px 20px",marginBottom:12}}><div style={{fontSize:13,fontWeight:500,color:C.t1,marginBottom:10}}>Include these for best results:</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["Buyer name","Sarah",true],["Price range","$400K-$600K",true],["Area or ZIP","Newton, 02459",true],["Beds / baths","3 bed 2 bath",false]].map(([l,ex,req],i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 10px",borderRadius:8,background:C.inp}}><span style={{fontSize:12,color:req?C.acc:C.t3,marginTop:1}}>{req?"\u2022":"\u25E6"}</span><div><div style={{fontSize:12,fontWeight:500,color:req?C.t1:C.t2}}>{l}{req&&<span style={{color:C.acc,marginLeft:3}}>*</span>}</div><div style={{fontSize:11,color:C.t3}}>{ex}</div></div></div>)}</div></div><div style={{display:"flex",gap:8,justifyContent:"center"}}><button onClick={mic} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:10,border:"1px solid "+C.b1,background:"transparent",color:C.t2,fontSize:13,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.acc;e.currentTarget.style.color=C.acc}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b1;e.currentTarget.style.color=C.t2}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>Voice</button></div></div>}
      </div>}
    </div>}

    {step==="details"&&parsed&&<div style={{maxWidth:660,margin:"0 auto"}}>
      {/* What we parsed */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>{parsed.name&&<B c="ac">{parsed.name}</B>}{parsed.price&&<B c="g">{parsed.price}</B>}{parsed.beds&&<B c="b">{parsed.beds}bd{parsed.baths?"/"+parsed.baths+"ba":""}</B>}{parsed.area&&<B c="a">{parsed.area}</B>}{parsed.zip&&<B c="a">ZIP {parsed.zip}</B>}{parsed.tags?.map(t=><B key={t} c="ac">{t}</B>)}</div>

      <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:14,padding:"24px 28px"}}>
        <div style={{fontSize:14,fontWeight:500,color:C.t1,marginBottom:4}}>What should the letter say about {parsed.name}?</div>
        <p style={{fontSize:13,color:C.t3,margin:"0 0 20px"}}>These become the bullet points in your letter.</p>

        {/* Financing */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:12,color:C.t2,marginBottom:8}}>Financing</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["pre-approved","Pre-approved"],["cash","Cash buyer"],["fha","FHA"],["va","VA"],["conventional","Conventional"]].map(([k,l])=>
              <button key={k} onClick={()=>setDetails(p=>({...p,financing:k}))} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",border:"none",background:details.financing===k?C.acc:C.inp,color:details.financing===k?"#1a1a1a":C.t2}}>{l}</button>
            )}
          </div>
        </div>

        {/* Closing */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:12,color:C.t2,marginBottom:8}}>Closing flexibility</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["flexible","Flexible"],["quick","Quick close (21 days)"],["30","30 days"],["60","No rush"],["rent","Open to rent-back"]].map(([k,l])=>
              <button key={k} onClick={()=>setDetails(p=>({...p,closing:k}))} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",border:"none",background:details.closing===k?C.acc:C.inp,color:details.closing===k?"#1a1a1a":C.t2}}>{l}</button>
            )}
          </div>
        </div>

        {/* Condition */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:12,color:C.t2,marginBottom:8}}>Property condition tolerance</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["minor-updates","Minor updates OK"],["as-is","As-is / no repairs"],["pristine","Move-in ready only"],["renovation","Major reno OK"]].map(([k,l])=>
              <button key={k} onClick={()=>setDetails(p=>({...p,condition:k}))} style={{padding:"7px 16px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",border:"none",background:details.condition===k?C.acc:C.inp,color:details.condition===k?"#1a1a1a":C.t2}}>{l}</button>
            )}
          </div>
        </div>

        {/* Extra note */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.t2,marginBottom:8}}>Anything else? <span style={{color:C.t3}}>(optional)</span></div>
          <input value={details.extra} onChange={e=>setDetails(p=>({...p,extra:e.target.value}))} placeholder="e.g. relocating from NYC, first-time buyer, growing family" style={{width:"100%",padding:"9px 14px",borderRadius:8,border:"1px solid "+C.b2,background:C.inp,color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.acc} onBlur={e=>e.target.style.borderColor=C.b2}/>
        </div>

        {/* Preview */}
        <div style={{padding:"14px 18px",background:C.inp,borderRadius:10,border:"1px solid "+C.b1}}>
          <div style={{fontSize:12,color:C.t3,marginBottom:8}}>Letter will say:</div>
          {getBullets().map((b,i)=>
            <div key={i} style={{display:"flex",gap:8,marginBottom:4}}><span style={{color:C.acc,fontSize:14}}>{"\u2713"}</span><span style={{fontSize:13,color:C.t1}}>{b}</span></div>
          )}
          {details.extra&&<div style={{display:"flex",gap:8,marginTop:2}}><span style={{color:C.acc,fontSize:14}}>{"\u2713"}</span><span style={{fontSize:13,color:C.t1}}>{details.extra}</span></div>}
        </div>
      </div>
    </div>}
  </div>;
}

// ═══ PIPELINE ═══
function Pipeline({buyer,onDone}){const[step,setStep]=useState(0);useEffect(()=>{const t=[setTimeout(()=>setStep(1),1000),setTimeout(()=>setStep(2),2000),setTimeout(()=>setStep(3),3000),setTimeout(onDone,4000)];return()=>t.forEach(clearTimeout);},[]);return <div style={{maxWidth:400,margin:"100px auto",textAlign:"center"}}><div style={{width:56,height:56,margin:"0 auto 24px",borderRadius:"50%",background:C.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{"\u2709"}</div><h2 style={{fontSize:20,fontWeight:500,color:C.t1,margin:"0 0 6px"}}>Finding homeowners for {buyer.name||"your buyer"}</h2><p style={{fontSize:13,color:C.t3,margin:"0 0 32px"}}>~30 seconds</p><div style={{display:"flex",flexDirection:"column",gap:6,textAlign:"left"}}>{["Searching off-market properties","Skip-tracing owners","Verifying addresses with Lob","Writing personalized letters"].map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",opacity:i<=step?1:.2,transition:"opacity .3s"}}><div style={{width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:i<step?C.grn:i===step?C.acc:C.inp,color:i<=step?"#1a1a1a":C.t3}}>{i<step?"\u2713":""}</div><span style={{fontSize:14,color:i<=step?C.t1:C.t3}}>{s}</span></div>)}</div></div>;}

// ═══ TRANSITION ═══
function Transition({label,onDone}){useEffect(()=>{const t=setTimeout(onDone,1200);return()=>clearTimeout(t);},[]);return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"120px 20px"}}><div style={{width:32,height:32,border:"2.5px solid "+C.b2,borderTopColor:C.acc,borderRadius:"50%",animation:"spin .8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{fontSize:14,color:C.t2,marginTop:16}}>{label}</div></div>;}

// ═══ LETTER ═══
function LetterStep({buyer,agent,onNext,onBack}){
  const[tmpl,setTmpl]=useState("tmpl_warm_v1");
  const bullets=buyer.bullets||["Pre-approved up to "+(buyer.price||"$600,000"),"Flexible on closing","Comfortable with minor updates"];
  const[barcode]=useState(()=>Array.from({length:32},()=>Math.random()>.5?2:1));

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
      <div><button onClick={onBack} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:12,padding:0,marginBottom:6,display:"block"}}>{"\u2190"} Back</button><h2 style={{fontSize:22,fontWeight:500,color:C.t1,margin:"0 0 4px"}}>Preview what {buyer.name||"Sarah"}{"\u2019"}s homeowners will receive</h2><p style={{fontSize:13,color:C.t2,margin:0}}>Envelope front + letter page 1</p></div>
      <Btn onClick={onNext} style={{padding:"10px 22px",fontSize:14,flexShrink:0}}>Choose audience {"\u2192"}</Btn>
    </div>

    {/* Template picker */}
    <div style={{display:"flex",gap:10,marginBottom:20,justifyContent:"center"}}>{TEMPLATES.map(t=><div key={t.id} onClick={()=>setTmpl(t.id)} style={{padding:"10px 16px",borderRadius:10,cursor:"pointer",border:tmpl===t.id?"2px solid "+C.acc:"1px solid "+C.b1,background:tmpl===t.id?C.accD:C.card}}><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{t.name}</div></div>)}</div>

    {/* Side-by-side: Envelope + Letter */}
    <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>

      {/* Envelope front */}
      <div style={{flex:"0 0 38%"}}>
        <div style={{fontSize:11,color:C.t3,marginBottom:6,textAlign:"center"}}>Envelope front</div>
        <div style={{width:"100%",aspectRatio:"9.5/4.125",background:"#fffdf8",borderRadius:8,boxShadow:"0 1px 12px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.06)",position:"relative",padding:"6% 7%",fontFamily:"-apple-system,sans-serif"}}>
          <div style={{position:"absolute",inset:0,borderRadius:8,overflow:"hidden",opacity:.03}}><div style={{width:"200%",height:"200%",background:"repeating-linear-gradient(45deg,#000 0,#000 1px,transparent 1px,transparent 6px)",transform:"translate(-25%,-25%)"}}/></div>
          {/* Return address */}
          <div style={{position:"relative"}}>
            {agent.logo&&<img src={agent.logo} style={{height:12,objectFit:"contain",opacity:.6,marginBottom:4,display:"block"}} alt=""/>}
            <div style={{fontSize:8,color:"#555",lineHeight:1.5}}>
              <div style={{fontWeight:600,color:"#333"}}>{agent.name||"Jimmy Mackin"}</div>
              <div>{agent.brokerage||"Mackin Realty"}</div>
              <div>{agent.addr}, {agent.city}, {agent.state} {agent.zip}</div>
            </div>
          </div>
          {/* Postage */}
          <div style={{position:"absolute",top:"8%",right:"7%",width:28,height:34,border:"1px solid #d0ccc2",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",background:"#faf8f2"}}><span style={{fontSize:5,color:"#b0aa9e",textAlign:"center",lineHeight:1.2}}>FIRST<br/>CLASS</span></div>
          {/* Recipient window */}
          <div style={{position:"absolute",left:"8%",top:"48%",width:"52%",height:"30%",background:"#fff",border:"1px solid #e8e4da",borderRadius:3,padding:"6px 8px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div style={{fontSize:5,color:"#ccc",marginBottom:2,textTransform:"uppercase",letterSpacing:".5px"}}>Visible through window</div>
            <div style={{fontSize:8,fontWeight:600,color:"#2c2a25"}}>Margaret Chen</div>
            <div style={{fontSize:7,color:"#666"}}>47 Oak Hill Rd</div>
            <div style={{fontSize:7,color:"#666"}}>Newton, MA 02459</div>
          </div>
          {/* Barcode */}
          <div style={{position:"absolute",bottom:"7%",left:"8%",right:"22%",height:5,display:"flex",gap:.5}}>{barcode.map((w,i)=><div key={i} style={{flex:w,background:"#ddd",borderRadius:.5}}/>)}</div>
        </div>
        {/* Envelope options below */}
        <div style={{marginTop:12,padding:"10px 12px",background:C.card,border:"1px solid "+C.b1,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:500,color:C.t1,marginBottom:6}}>Envelope</div>
          <div style={{display:"flex",gap:6}}>
            {[["Standard #10","Free",true],["Custom branded","Enterprise",false]].map(([l,d,on])=>
              <div key={l} style={{flex:1,padding:"6px 8px",borderRadius:6,border:on?"1.5px solid "+C.acc:"1px solid "+C.b1,background:on?C.accD:C.inp}}>
                <div style={{fontSize:10,fontWeight:500,color:C.t1}}>{l}</div>
                <div style={{fontSize:9,color:on?C.t3:C.amb}}>{d}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Letter page 1 */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,color:C.t3,marginBottom:6,textAlign:"center"}}>Letter (page 1)</div>
        <div style={{width:"100%",aspectRatio:"8.5/11",background:"#fffdf8",borderRadius:10,boxShadow:"0 2px 20px rgba(0,0,0,.2),0 0 0 1px rgba(0,0,0,.06)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:"8%",right:"8%",height:3,background:"linear-gradient(90deg,#7EC8E3,#4A7A2E,#6B9E4A)",borderRadius:"0 0 2px 2px",opacity:.7}}/>
          <div style={{position:"absolute",top:"4.5%",left:"6%",right:"6%",bottom:"4%",display:"flex",flexDirection:"column",fontFamily:"Georgia,'Times New Roman',serif",color:"#2c2a25",fontSize:"min(1.8vw,13px)",lineHeight:1.7}}>
            <Hills/>
            <p style={{margin:"0 0 2.5%"}}>Your home at <strong style={{background:"rgba(201,148,62,0.15)",padding:"0 3px",borderRadius:3}}>{"{"}{"{"} address {"}"}{"}"}}</strong> is one of the only properties that my clients, <strong>{buyer.name||"Sarah"}</strong>, would seriously consider buying in {buyer.area||"Newton"}.</p>
            <p style={{margin:"0 0 2.5%",color:"#4a4840"}}>We{"\u2019"}ve looked at everything on the market. Nothing has been the right fit.</p>
            <p style={{margin:"0 0 2.5%",color:"#4a4840"}}>I promised them I{"\u2019"}d do everything in my power to find them a home. That{"\u2019"}s why I{"\u2019"}m writing to you.</p>
            <div style={{margin:"1.5% 0",padding:"3% 4%",background:"#f5f2eb",borderRadius:8,borderLeft:"3px solid "+C.acc}}>
              <p style={{margin:"0 0 2%",fontWeight:700,fontSize:"min(1.6vw,12px)",fontFamily:"-apple-system,sans-serif",color:"#3a3830"}}>Here{"\u2019"}s what to know about {buyer.name||"Sarah"}:</p>
              {bullets.map((b,i)=><div key={i} style={{display:"flex",gap:"2%",marginBottom:"1%"}}><span style={{color:C.acc,flexShrink:0}}>{"\u2713"}</span><span style={{fontSize:"min(1.7vw,12px)",color:"#4a4840"}}>{b}</span></div>)}
              {buyer.details?.extra&&<div style={{display:"flex",gap:"2%",marginBottom:"1%"}}><span style={{color:C.acc,flexShrink:0}}>{"\u2713"}</span><span style={{fontSize:"min(1.7vw,12px)",color:"#4a4840"}}>{buyer.details.extra}</span></div>}
            </div>
            <p style={{margin:"0 0 2.5%",color:"#4a4840"}}>No guarantees. But if the right offer could change your plans, a conversation is worth your time.</p>
            <p style={{margin:"0 0 2.5%"}}>My cell: <strong>{agent.phone||"(617) 921-5263"}</strong></p>
            <p style={{margin:"0 0 3%",fontStyle:"italic",color:"#6a6860"}}>Looking forward,</p>
            <div style={{display:"flex",alignItems:"center",gap:"3%",padding:"2% 3%",background:"#f0ede5",borderRadius:8,marginBottom:"2.5%"}}>
              {agent.headshot?<img src={agent.headshot} style={{width:"8%",aspectRatio:"1",borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt=""/>:<div style={{width:"8%",aspectRatio:"1",borderRadius:5,background:"linear-gradient(135deg,#3a3830,#2a2a25)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fffdf8",fontSize:"min(2.2vw,14px)",fontWeight:700,fontFamily:"-apple-system,sans-serif",flexShrink:0}}>{(agent.name||"JM").split(" ").map(n=>n[0]).join("")}</div>}
              <div style={{lineHeight:1.3,flex:1}}><div style={{fontWeight:700,fontSize:"min(1.8vw,12px)",fontFamily:"-apple-system,sans-serif"}}>{agent.name||"Jimmy Mackin"}</div><div style={{fontSize:"min(1.6vw,11px)",color:"#7a7870",fontFamily:"-apple-system,sans-serif"}}>{agent.brokerage} {"\u00b7"} {agent.phone}</div>{agent.website&&<div style={{fontSize:"min(1.4vw,10px)",color:"#9a9690",fontFamily:"-apple-system,sans-serif"}}>{agent.website}</div>}</div>
              {agent.logo&&<img src={agent.logo} style={{height:"6%",maxWidth:"16%",objectFit:"contain",flexShrink:0,opacity:.8}} alt=""/>}
            </div>
            <div style={{padding:"2% 3%",background:"#faf8f2",borderRadius:8,border:"1px solid #ece8de"}}><p style={{margin:0,fontSize:"min(1.7vw,12px)",color:"#5a5850"}}><strong style={{color:"#3a3830"}}>p.s.</strong> Free home value report {"\u2014"} no obligation.</p></div>
            <div style={{marginTop:"auto",paddingTop:"1.5%",borderTop:"1px solid #e8e4da"}}><p style={{margin:0,fontSize:"min(1.2vw,8px)",color:"#b0aa9e",fontFamily:"-apple-system,sans-serif"}}>If listed with a broker, please disregard.{agent.license?" Lic #"+agent.license:""}</p></div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// ═══ AUDIENCE ═══
function Pill({options,value,onChange}){return <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{options.map(([l,v])=><button key={l} onClick={()=>onChange(v)} style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:500,cursor:"pointer",border:"none",background:value===v?C.acc:C.inp,color:value===v?"#1a1a1a":C.t2}}>{l}</button>)}</div>;}

// Map component
function PropertyMap({owners,sel,onToggle,filtered,activeHoods}){
  const[hover,setHover]=useState(null);
  const filteredIds=new Set(filtered.map(o=>o.id));
  // Newton bounding box
  const latMin=42.300,latMax=42.365,lngMin=-71.23,lngMax=-71.15;
  const toX=lng=>((lng-lngMin)/(lngMax-lngMin))*100;
  const toY=lat=>((latMax-lat)/(latMax-latMin))*100;
  const hoods=HOODS;

  return <div style={{position:"relative",background:"#1e1e1e",borderRadius:12,border:"1px solid "+C.b1,overflow:"hidden"}}>
    <svg viewBox="0 0 100 100" style={{width:"100%",height:"auto",display:"block",aspectRatio:"1.3/1"}}>
      {/* Grid lines for street feel */}
      {[20,40,60,80].map(v=><line key={"h"+v} x1="0" y1={v} x2="100" y2={v} stroke={C.b1} strokeWidth=".15"/>)}
      {[20,40,60,80].map(v=><line key={"v"+v} x1={v} y1="0" x2={v} y2="100" stroke={C.b1} strokeWidth=".15"/>)}
      {/* Neighborhood labels */}
      {hoods.map(h=><text key={h.name} x={toX(h.lng)} y={toY(h.lat)} fill={activeHoods&&!activeHoods.has(h.name)?C.b1:C.t3} fontSize="2.2" textAnchor="middle" style={{fontFamily:"-apple-system,sans-serif",opacity:activeHoods&&!activeHoods.has(h.name)?.2:.5}}>{h.name}</text>)}
      {/* Property dots */}
      {owners.map(o=>{
        const inFilter=filteredIds.has(o.id);
        if(!inFilter)return null;
        const selected=sel.has(o.id);
        const ok=o.ok&&o.verified;
        const cx=toX(o.lng),cy=toY(o.lat);
        const fill=o.dnc?C.red:!o.verified?"#444":selected?C.acc:"#555";
        const r=hover===o.id?1.8:1.2;
        if(o.manual){
          const s=r*1.4;return <rect key={o.id} x={cx-s/2} y={cy-s/2} width={s} height={s} fill={fill} stroke={selected?"#fff":"none"} strokeWidth=".3" transform={`rotate(45 ${cx} ${cy})`} style={{cursor:"pointer"}} onClick={()=>onToggle(o.id)} onMouseEnter={()=>setHover(o.id)} onMouseLeave={()=>setHover(null)}/>;
        }
        return <circle key={o.id} cx={cx} cy={cy} r={r} fill={fill} stroke={selected?"#fff":"none"} strokeWidth=".3" style={{cursor:ok?"pointer":"default",transition:"r .15s"}} onClick={()=>ok&&onToggle(o.id)} onMouseEnter={()=>setHover(o.id)} onMouseLeave={()=>setHover(null)}/>;
      })}
    </svg>
    {/* Legend */}
    <div style={{position:"absolute",bottom:10,left:12,display:"flex",gap:12}}>
      {[[C.acc,"Selected"],["#555","Deselected"],[C.red,"DNC"],["#444","Unverified"],[C.acc,"Manual \u25C7"]].map(([c,l])=>
        <div key={l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:l.includes("\u25C7")?1:"50%",background:c,transform:l.includes("\u25C7")?"rotate(45deg)":"none"}}/><span style={{fontSize:10,color:C.t3}}>{l.replace(" \u25C7","")}</span></div>
      )}
    </div>
    {/* Hover tooltip */}
    {hover&&(()=>{
      const o=owners.find(x=>x.id===hover);if(!o)return null;
      const x=toX(o.lng),y=toY(o.lat);
      return <div style={{position:"absolute",left:x+"%",top:y+"%",transform:"translate(-50%,-110%)",background:"#2a2a2a",border:"1px solid "+C.b2,borderRadius:8,padding:"8px 12px",pointerEvents:"none",whiteSpace:"nowrap",zIndex:10,boxShadow:"0 4px 12px rgba(0,0,0,.4)"}}>
        <div style={{fontSize:12,fontWeight:500,color:C.t1}}>{o.name}</div>
        <div style={{fontSize:11,color:C.t2}}>{o.addr}, {o.neighborhood} {o.zip}</div>
        <div style={{fontSize:10,color:C.t3,marginTop:2}}>${o.val}K {"\u00b7"} {o.bd}/{o.ba} {"\u00b7"} {o.sqft.toLocaleString()}sf {"\u00b7"} {o.eq}% equity {"\u00b7"} {o.yr}yr</div>
        <div style={{marginTop:3}}><B c={o.type==="Absentee"?"a":o.type==="Investor"?"b":"x"}>{o.type}</B>{o.manual&&<span style={{marginLeft:4}}><B c="ac">Manual</B></span>}{o.dnc&&<span style={{marginLeft:4}}><B c="r">DNC</B></span>}</div>
        <div style={{fontSize:10,color:sel.has(o.id)?C.acc:C.t3,marginTop:3}}>{sel.has(o.id)?"\u2713 Selected":"Click to select"}</div>
      </div>;
    })()}
  </div>;
}

function AudienceStep({buyer,owners:initOwners,onNext,onBack}){
  const[owners,setOwners]=useState(initOwners);
  const[sf,setSf]=useState(false);
  const[view,setView]=useState("map");
  const[showAdd,setShowAdd]=useState(false);
  const[addAddr,setAddAddr]=useState("");
  const[addName,setAddName]=useState("");
  const allHoods=HOODS.map(h=>h.name);
  const allZips=[...new Set(HOODS.map(h=>h.zip))];
  const allCities=["Newton","Brookline","Watertown","Wellesley"];
  const[fil,setFil]=useState({priceMin:400,priceMax:650,eq:0,yr:0,absentee:true,owner:true,investor:false,bdMin:0,baMin:0,sqMin:0,sqMax:9999,hoods:new Set(allHoods),zips:new Set(allZips),cities:new Set(allCities)});
  const uf=(k,v)=>setFil(p=>({...p,[k]:v}));

  const filtered=owners.filter(o=>{
    if(o.val<fil.priceMin||o.val>fil.priceMax)return false;
    if(fil.eq>0&&o.eq<fil.eq)return false;
    if(fil.yr>0&&o.yr<fil.yr)return false;
    if(o.type==="Absentee"&&!fil.absentee)return false;
    if(o.type==="Owner"&&!fil.owner)return false;
    if(o.type==="Investor"&&!fil.investor)return false;
    if(fil.bdMin>0&&o.bd<fil.bdMin)return false;
    if(fil.baMin>0&&o.ba<fil.baMin)return false;
    if(fil.sqMin>0&&o.sqft<fil.sqMin)return false;
    if(fil.sqMax<9999&&o.sqft>fil.sqMax)return false;
    if(!fil.hoods.has(o.neighborhood))return false;
    if(!fil.zips.has(o.zip))return false;
    if(!fil.cities.has(o.city))return false;
    return true;
  });
  const sendable=filtered.filter(o=>o.ok&&o.verified);

  const[sel,setSel]=useState(()=>new Set(owners.filter(o=>o.ok&&o.verified).map(o=>o.id)));
  const applyFilters=()=>{setSel(new Set(sendable.map(o=>o.id)));setSf(false);};
  const resetFilters=()=>{setFil({priceMin:400,priceMax:650,eq:0,yr:0,absentee:true,owner:true,investor:false,bdMin:0,baMin:0,sqMin:0,sqMax:9999,hoods:new Set(allHoods),zips:new Set(allZips),cities:new Set(allCities)});};
  const tg=id=>{const n=new Set(sel);n.has(id)?n.delete(id):n.add(id);setSel(n);};
  const sc=[...sel].filter(id=>filtered.some(o=>o.id===id)).length;
  const activeFilters=(()=>{let c=0;if(fil.priceMin!==400)c++;if(fil.priceMax!==650)c++;if(fil.eq!==0)c++;if(fil.yr!==0)c++;if(!fil.absentee)c++;if(!fil.owner)c++;if(fil.investor)c++;if(fil.bdMin!==0)c++;if(fil.baMin!==0)c++;if(fil.sqMin!==0)c++;if(fil.sqMax!==9999)c++;if(fil.hoods.size<allHoods.length)c++;if(fil.zips.size<allZips.length)c++;if(fil.cities.size<allCities.length)c++;return c;})();

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
      <div><button onClick={onBack} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:12,padding:0,marginBottom:6,display:"block"}}>{"\u2190"} Back to letter</button><h2 style={{fontSize:22,fontWeight:500,color:C.t1,margin:"0 0 4px"}}>{sendable.length} sendable homeowners</h2><p style={{fontSize:13,color:C.t2,margin:0}}>{buyer.area||"Newton"} {"\u00b7"} {buyer.price||"$400K\u2013$600K"} {"\u00b7"} {filtered.length} of {owners.length} shown {"\u00b7"} Addresses verified</p></div>
      <Btn onClick={()=>onNext(sc,owners)} disabled={sc===0} style={{padding:"10px 24px",fontSize:14,flexShrink:0}}>Send {sc} Letters {"\u2192"}</Btn>
    </div>

    {/* Toolbar: select/clear, view toggle, filters */}
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
      <span style={{fontSize:12,color:C.t2}}>{sc} of {sendable.length} selected</span>
      <button onClick={()=>setSel(new Set(sendable.map(o=>o.id)))} style={{background:"none",border:"none",color:C.acc,fontSize:12,cursor:"pointer",fontWeight:500,padding:0}}>All</button>
      <button onClick={()=>setSel(new Set())} style={{background:"none",border:"none",color:C.t3,fontSize:12,cursor:"pointer",padding:0}}>Clear</button>
      <div style={{flex:1}}/>
      {/* Add property */}
      <button onClick={()=>setShowAdd(!showAdd)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"1px solid "+C.b2,borderRadius:8,padding:"6px 12px",color:C.t2,fontSize:12,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.acc;e.currentTarget.style.color=C.acc}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b2;e.currentTarget.style.color=C.t2}}>+ Add property</button>
      {/* Map/List toggle */}
      <div style={{display:"flex",borderRadius:8,border:"1px solid "+C.b1,overflow:"hidden"}}>
        <button onClick={()=>setView("map")} style={{padding:"5px 12px",fontSize:11,fontWeight:500,cursor:"pointer",border:"none",background:view==="map"?C.card:"transparent",color:view==="map"?C.t1:C.t3}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:"middle",marginRight:4}}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          Map
        </button>
        <button onClick={()=>setView("list")} style={{padding:"5px 12px",fontSize:11,fontWeight:500,cursor:"pointer",border:"none",borderLeft:"1px solid "+C.b1,background:view==="list"?C.card:"transparent",color:view==="list"?C.t1:C.t3}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:"middle",marginRight:4}}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          List
        </button>
      </div>
      <button onClick={()=>setSf(!sf)} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"1px solid "+(activeFilters>0?C.acc:C.b2),borderRadius:8,padding:"6px 14px",color:activeFilters>0?C.acc:C.t2,fontSize:12,cursor:"pointer"}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
        Filters{activeFilters>0?` (${activeFilters})`:""}
      </button>
    </div>

    {/* Add property form */}
    {showAdd&&<div style={{background:C.card,border:"1px solid "+C.acc,borderRadius:12,padding:"18px 22px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,color:C.t1}}>Add a property manually</div>
        <button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",color:C.t3,fontSize:16,cursor:"pointer",padding:0}}>{"\u00d7"}</button>
      </div>
      <p style={{fontSize:12,color:C.t3,margin:"0 0 12px"}}>Add a home that wasn{"\u2019"}t found in the search. We{"\u2019"}ll skip-trace the owner and verify the address.</p>
      <div style={{display:"flex",gap:10,marginBottom:10}}>
        <div style={{flex:1}}><div style={{fontSize:11,color:C.t2,marginBottom:4}}>Street address *</div><input value={addAddr} onChange={e=>setAddAddr(e.target.value)} placeholder="47 Maple St" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid "+C.b2,background:C.inp,color:C.t1,fontSize:13,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.acc} onBlur={e=>e.target.style.borderColor=C.b2}/></div>
        <div style={{flex:"0 0 160px"}}><div style={{fontSize:11,color:C.t2,marginBottom:4}}>Owner name <span style={{color:C.t3}}>(optional)</span></div><input value={addName} onChange={e=>setAddName(e.target.value)} placeholder="If known" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid "+C.b2,background:C.inp,color:C.t1,fontSize:13,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.acc} onBlur={e=>e.target.style.borderColor=C.b2}/></div>
        <div style={{display:"flex",alignItems:"flex-end"}}><Btn disabled={!addAddr.trim()} onClick={()=>{
          const hood=HOODS[Math.floor(Math.random()*HOODS.length)];
          const newO={id:Date.now(),name:addName.trim()||"Owner (pending skip trace)",addr:addAddr.trim(),city:"Newton",neighborhood:hood.name,zip:hood.zip,val:450+Math.round(Math.random()*150),bd:3,ba:2,sqft:1600+Math.floor(Math.random()*600),eq:40,yr:8,lat:hood.lat+Math.random()*0.01-0.005,lng:hood.lng+Math.random()*0.01-0.005,type:"Owner",ok:true,dnc:false,verified:true,del:null,manual:true};
          setOwners(p=>[...p,newO]);setSel(p=>{const n=new Set(p);n.add(newO.id);return n;});setAddAddr("");setAddName("");setShowAdd(false);
        }} style={{padding:"8px 18px",fontSize:13,borderRadius:8}}>Add</Btn></div>
      </div>
      <div style={{fontSize:11,color:C.t3}}>In production: address is verified via Lob, owner is skip-traced via RealEstateAPI, property data is enriched.</div>
    </div>}

    {sf&&<div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"20px 24px",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><span style={{fontSize:13,fontWeight:500,color:C.t1}}>Filters</span><button onClick={()=>setSf(false)} style={{background:"none",border:"none",color:C.t3,fontSize:18,cursor:"pointer",padding:0}}>{"\u00d7"}</button></div>

      {/* Location */}
      <div style={{marginBottom:16,paddingBottom:16,borderBottom:"1px solid "+C.b1}}>
        <div style={{fontSize:12,color:C.t2,marginBottom:10,fontWeight:500}}>Location</div>

        {/* City */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:C.t3,marginBottom:6}}>City</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {allCities.map(c=>{const on=fil.cities.has(c);const cnt=owners.filter(o=>o.city===c).length;return <button key={c} onClick={()=>{const n=new Set(fil.cities);on?n.delete(c):n.add(c);setFil(p=>({...p,cities:n}));}} style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:500,cursor:"pointer",border:"none",background:on?C.accD:C.inp,color:on?C.acc:C.t3,display:"flex",alignItems:"center",gap:4}}>
              {c}<span style={{fontSize:9,opacity:.6}}>({cnt})</span>
            </button>;})}
          </div>
        </div>

        <div style={{display:"flex",gap:20}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:C.t3,marginBottom:6}}>Neighborhoods</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {allHoods.map(h=>{const on=fil.hoods.has(h);const cnt=owners.filter(o=>o.neighborhood===h).length;return <button key={h} onClick={()=>{const n=new Set(fil.hoods);on?n.delete(h):n.add(h);setFil(p=>({...p,hoods:n}));}} style={{padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:500,cursor:"pointer",border:"none",background:on?C.accD:C.inp,color:on?C.acc:C.t3,display:"flex",alignItems:"center",gap:4}}>
                {h}<span style={{fontSize:9,opacity:.6}}>({cnt})</span>
              </button>;})}
            </div>
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <button onClick={()=>setFil(p=>({...p,hoods:new Set(allHoods)}))} style={{background:"none",border:"none",color:C.acc,fontSize:11,cursor:"pointer",padding:0,fontWeight:500}}>All</button>
              <button onClick={()=>setFil(p=>({...p,hoods:new Set()}))} style={{background:"none",border:"none",color:C.t3,fontSize:11,cursor:"pointer",padding:0}}>None</button>
            </div>
          </div>
          <div style={{flex:"0 0 180px"}}>
            <div style={{fontSize:12,color:C.t3,marginBottom:6}}>ZIP codes</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {allZips.map(z=>{const on=fil.zips.has(z);const cnt=owners.filter(o=>o.zip===z).length;return <button key={z} onClick={()=>{const n=new Set(fil.zips);on?n.delete(z):n.add(z);setFil(p=>({...p,zips:n}));}} style={{padding:"5px 10px",borderRadius:6,fontSize:11,fontWeight:500,cursor:"pointer",border:"none",background:on?C.accD:C.inp,color:on?C.acc:C.t3,display:"flex",alignItems:"center",gap:4}}>
                {z}<span style={{fontSize:9,opacity:.6}}>({cnt})</span>
              </button>;})}
            </div>
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <button onClick={()=>setFil(p=>({...p,zips:new Set(allZips)}))} style={{background:"none",border:"none",color:C.acc,fontSize:11,cursor:"pointer",padding:0,fontWeight:500}}>All</button>
              <button onClick={()=>setFil(p=>({...p,zips:new Set()}))} style={{background:"none",border:"none",color:C.t3,fontSize:11,cursor:"pointer",padding:0}}>None</button>
            </div>
          </div>
        </div>
      </div>

      {/* Property filters */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        <div>
          <div style={{fontSize:12,color:C.t3,marginBottom:6}}>Est. value ($K)</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}><input value={fil.priceMin} onChange={e=>uf("priceMin",parseInt(e.target.value)||0)} style={{flex:1,background:C.inp,border:"1px solid "+C.b2,borderRadius:6,padding:"6px 10px",color:C.t1,fontSize:12,outline:"none",width:0}}/><span style={{color:C.t3,fontSize:11}}>{"\u2013"}</span><input value={fil.priceMax} onChange={e=>uf("priceMax",parseInt(e.target.value)||999)} style={{flex:1,background:C.inp,border:"1px solid "+C.b2,borderRadius:6,padding:"6px 10px",color:C.t1,fontSize:12,outline:"none",width:0}}/></div>
          <div style={{fontSize:12,color:C.t3,marginTop:12,marginBottom:6}}>Equity %</div>
          <Pill options={[["Any",0],["20%+",20],["40%+",40],["60%+",60]]} value={fil.eq} onChange={v=>uf("eq",v)}/>
        </div>
        <div>
          <div style={{fontSize:12,color:C.t3,marginBottom:6}}>Years owned</div>
          <Pill options={[["Any",0],["3+",3],["5+",5],["10+",10],["20+",20]]} value={fil.yr} onChange={v=>uf("yr",v)}/>
          <div style={{fontSize:12,color:C.t3,marginTop:12,marginBottom:6}}>Owner type</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <Tgl on={fil.absentee} label="Absentee" onClick={()=>uf("absentee",!fil.absentee)}/>
            <Tgl on={fil.owner} label="Owner-occupied" onClick={()=>uf("owner",!fil.owner)}/>
            <Tgl on={fil.investor} label="Investors" onClick={()=>uf("investor",!fil.investor)}/>
          </div>
        </div>
        <div>
          <div style={{fontSize:12,color:C.t3,marginBottom:6}}>Bedrooms</div>
          <Pill options={[["Any",0],["2+",2],["3+",3],["4+",4]]} value={fil.bdMin} onChange={v=>uf("bdMin",v)}/>
          <div style={{fontSize:12,color:C.t3,marginTop:12,marginBottom:6}}>Bathrooms</div>
          <Pill options={[["Any",0],["1+",1],["2+",2],["3+",3]]} value={fil.baMin} onChange={v=>uf("baMin",v)}/>
          <div style={{fontSize:12,color:C.t3,marginTop:12,marginBottom:6}}>Sq ft</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}><input value={fil.sqMin||""} onChange={e=>uf("sqMin",parseInt(e.target.value)||0)} placeholder="Min" style={{flex:1,background:C.inp,border:"1px solid "+C.b2,borderRadius:6,padding:"6px 10px",color:C.t1,fontSize:12,outline:"none",width:0}}/><span style={{color:C.t3,fontSize:11}}>{"\u2013"}</span><input value={fil.sqMax>=9999?"":fil.sqMax} onChange={e=>uf("sqMax",parseInt(e.target.value)||9999)} placeholder="Max" style={{flex:1,background:C.inp,border:"1px solid "+C.b2,borderRadius:6,padding:"6px 10px",color:C.t1,fontSize:12,outline:"none",width:0}}/></div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:12,borderTop:"1px solid "+C.b1}}>
        <button onClick={resetFilters} style={{background:"none",border:"none",color:C.t3,fontSize:12,cursor:"pointer",padding:0}}>Reset to defaults</button>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:12,color:C.t2}}>{sendable.length} match</span>
          <Btn onClick={applyFilters} style={{padding:"7px 20px",fontSize:13,borderRadius:8}}>Apply {"\u0026"} select all</Btn>
        </div>
      </div>
    </div>}

    {/* MAP VIEW */}
    {view==="map"&&<div>
      <PropertyMap owners={owners} sel={sel} onToggle={tg} filtered={filtered} activeHoods={fil.hoods}/>
      <div style={{fontSize:11,color:C.t3,marginTop:8,textAlign:"center"}}>Click any dot to select or deselect {"\u00b7"} Hover for details {"\u00b7"} Use filters to narrow the area</div>
    </div>}

    {/* LIST VIEW */}
    {view==="list"&&<div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,overflow:"hidden"}}><div style={{maxHeight:400,overflowY:"auto"}}>
      {filtered.length===0?<div style={{padding:"40px 20px",textAlign:"center"}}><div style={{fontSize:14,color:C.t2}}>No homeowners match these filters</div><button onClick={resetFilters} style={{background:"none",border:"none",color:C.acc,fontSize:13,cursor:"pointer",marginTop:8}}>Reset filters</button></div>:
      filtered.map((o,i)=>{const ok=o.ok&&o.verified;const checked=sel.has(o.id);return <div key={o.id} style={{display:"flex",alignItems:"center",gap:14,padding:"11px 20px",borderBottom:i<filtered.length-1?"1px solid "+C.b1:"none",opacity:o.dnc?.35:!o.verified?.5:1}} onMouseEnter={e=>e.currentTarget.style.background=C.hover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <input type="checkbox" checked={checked} onChange={()=>tg(o.id)} disabled={!ok} style={{accentColor:C.acc,width:15,height:15}}/>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13,fontWeight:500,color:C.t1}}>{o.name}</span>{o.manual&&<B c="ac">Manual</B>}{o.dnc&&<B c="r">DNC</B>}{!o.verified&&<B c="x">Bad addr</B>}</div>
          <div style={{fontSize:11,color:C.t3,marginTop:2}}>{o.addr}, {o.neighborhood} {o.zip} {"\u00b7"} ${o.val}K {"\u00b7"} {o.bd}/{o.ba} {"\u00b7"} {o.sqft.toLocaleString()}sf {"\u00b7"} {o.eq}% eq {"\u00b7"} {o.yr}yr</div>
        </div>
        <B c={o.type==="Absentee"?"a":o.type==="Investor"?"b":"x"}>{o.type}</B>
      </div>;})}
    </div></div>}

    {/* Cost bar */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,padding:"14px 20px",background:C.card,border:"1px solid "+C.b1,borderRadius:10}}><span style={{fontSize:14,color:C.t1}}>{sc} {"\u00d7"} $1.12</span><span style={{fontSize:16,fontWeight:600,color:C.acc}}>${(sc*1.12).toFixed(2)}</span></div>
  </div>;
}

// ═══ SEND ═══
function SendStep({count,buyer,agent,onBack,onDone}){
  const[sending,setSending]=useState(false);const[sent,setSent]=useState(false);const[prog,setProg]=useState(0);
  const go=()=>{setSending(true);let p=0;const iv=setInterval(()=>{p+=Math.ceil(count/18);if(p>=count){p=count;clearInterval(iv);setTimeout(()=>setSent(true),400);}setProg(p);},140);};
  const cost=(count*1.12).toFixed(2);

  if(sent)return <div style={{textAlign:"center",padding:"80px 20px",maxWidth:500,margin:"0 auto"}}>
    <div style={{width:56,height:56,borderRadius:"50%",background:C.grnD,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:24,color:C.grn}}>{"\u2713"}</div>
    <h2 style={{fontSize:22,fontWeight:500,color:C.t1,margin:"0 0 8px"}}>{count} letters queued with Lob</h2>
    <p style={{fontSize:14,color:C.t2,margin:"0 0 6px"}}>Expected delivery: March 21{"\u2013"}24, 2026</p>
    <p style={{fontSize:13,color:C.t3,margin:"0 0 24px"}}>You can cancel any letter within 4 hours from your dashboard.</p>
    <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"16px 20px",textAlign:"left",marginBottom:24}}>
      <div style={{fontSize:12,color:C.t3,marginBottom:10}}>Tracking timeline</div>
      {[["letter.created","Lob receives the request","Now"],["letter.rendered_pdf","PDF rendered for print","~2 min"],["letter.in_transit","Picked up by USPS","~1 business day"],["letter.delivered","Confirmed delivered","3\u20135 business days"]].map(([ev,desc,t],i)=>
        <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:i<3?10:0}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:i===0?C.grn:C.b2,flexShrink:0,marginTop:5}}/>
          <div style={{flex:1}}><div style={{fontSize:13,color:C.t1}}>{desc}</div><div style={{fontSize:11,color:C.t3,fontFamily:"monospace"}}>{ev}</div></div>
          <span style={{fontSize:11,color:C.t3,flexShrink:0}}>{t}</span>
        </div>
      )}
    </div>
    <Btn onClick={onDone} style={{padding:"11px 28px"}}>Back to Dashboard</Btn>
  </div>;

  return <div>
    <div style={{marginBottom:20}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:12,padding:0,marginBottom:6,display:"block"}}>{"\u2190"} Back to audience</button>
      <h2 style={{fontSize:22,fontWeight:500,color:C.t1,margin:"0 0 4px"}}>Review {"\u0026"} send {count} letters</h2>
      <p style={{fontSize:13,color:C.t2,margin:0}}>For {buyer?.name||"Sarah"} in {buyer?.area||"Newton"}</p>
    </div>

    {/* Info cards — two column grid */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>

      {/* Campaign summary */}
      <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"18px 22px"}}>
        <div style={{fontSize:13,fontWeight:500,color:C.t1,marginBottom:12}}>Campaign summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["Buyer",buyer?.name||"Sarah"],["Area",buyer?.area||"Newton"],["Price range",buyer?.price||"$400K\u2013$600K"],["Template","Warm + Personal"],["Recipients",count+" homeowners"],["Addresses","Verified via Lob"]].map(([l,v])=>
            <div key={l}><div style={{fontSize:11,color:C.t3}}>{l}</div><div style={{fontSize:13,color:C.t1,marginTop:1}}>{v}</div></div>
          )}
        </div>
      </div>

      {/* Recipient breakdown */}
      <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"18px 22px"}}>
        <div style={{fontSize:13,fontWeight:500,color:C.t1,marginBottom:12}}>Recipient breakdown</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[["Properties searched","100","RealEstateAPI PropertySearch",C.t1],["DNC removed","\u22124","National Do Not Contact registry",C.red],["Undeliverable","\u22125","Failed Lob address verification",C.red],["Selected by you",String(count),"After your filters",C.acc]].map(([l,v,sub,c])=>
            <div key={l} style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:15,fontWeight:600,color:c,width:36,textAlign:"right",flexShrink:0}}>{v}</span>
              <div><div style={{fontSize:13,color:C.t1}}>{l}</div><div style={{fontSize:11,color:C.t3}}>{sub}</div></div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery specs */}
      <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"18px 22px"}}>
        <div style={{fontSize:13,fontWeight:500,color:C.t1,marginBottom:12}}>Delivery specs</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["Mail type","USPS First Class"],["Envelope","Standard #10"],["Paper","8.5\u00d711, color"],["Address placement","Top of first page"],["Expected delivery","Mar 21\u201324, 2026"],["Cancel window","4 hours"]].map(([l,v])=>
            <div key={l}><div style={{fontSize:11,color:C.t3}}>{l}</div><div style={{fontSize:13,color:C.t1,marginTop:1}}>{v}</div></div>
          )}
        </div>
      </div>

      {/* Letter preview snippet */}
      <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:12,padding:"18px 22px"}}>
        <div style={{fontSize:13,fontWeight:500,color:C.t1,marginBottom:10}}>Letter opening (per recipient)</div>
        <div style={{fontSize:13,color:C.t2,lineHeight:1.6,fontFamily:"Georgia,serif",fontStyle:"italic"}}>{"\u201C"}Your home at <strong style={{color:C.t1}}>47 Oak Hill Rd</strong> is one of the only properties that my clients, <strong style={{color:C.t1}}>{buyer?.name||"Sarah"}</strong>, would seriously consider buying in {buyer?.area||"Newton"}.{"\u201D"}</div>
        <div style={{fontSize:11,color:C.t3,marginTop:8}}>Each letter personalizes the property address via merge variable</div>
      </div>
    </div>

    {/* Cost + Confirm — full width, sticky at bottom */}
    <div style={{background:C.card,border:"1px solid "+C.b1,borderRadius:14,padding:"24px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <span style={{fontSize:14,color:C.t2}}>{count} letters {"\u00d7"} $1.12</span>
        <span style={{fontSize:14,color:C.t1,fontWeight:500}}>${cost}</span>
      </div>
      <div style={{height:1,background:C.b1,margin:"12px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:18,fontWeight:600,color:C.t1}}>Total</span>
        <span style={{fontSize:22,fontWeight:700,color:C.acc}}>${cost}</span>
      </div>
      {sending&&!sent&&<div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.t2,marginBottom:6}}><span>Sending to Lob... {prog}/{count}</span><span>{Math.round(prog/count*100)}%</span></div>
        <div style={{height:6,borderRadius:3,background:C.inp}}><div style={{width:(prog/count*100)+"%",height:"100%",borderRadius:3,background:C.acc,transition:"width .14s"}}/></div>
      </div>}
      <Btn onClick={go} disabled={sending} style={{width:"100%",justifyContent:"center",padding:"15px",fontSize:16,borderRadius:12}}>{sending?`Sending ${prog}/${count}...`:`Confirm \u0026 Send \u2014 $${cost}`}</Btn>
      <p style={{fontSize:11,color:C.t3,textAlign:"center",marginTop:10,marginBottom:0}}>Lob prints + USPS delivers {"\u00b7"} You can cancel within 4 hours from your dashboard</p>
    </div>
  </div>;
}

// ═══ APP ═══
export default function App(){
  const[s,setS]=useState("dash");
  const[agent,setAgent]=useState({name:"Jimmy Mackin",brokerage:"Mackin Realty",phone:"(617) 921-5263",email:"jimmy@listingleads.com",website:"listingleads.com",addr:"123 Main St",city:"Boston",state:"MA",zip:"02101",license:"",headshot:null,logo:null,lob_address_id:"adr_demo123"});
  const[buyer,setBuyer]=useState(null);
  const[owners,setOwners]=useState([]);
  const[cnt,setCnt]=useState(0);
  const[camps,setCamps]=useState(SEED_CAMPS);
  const[viewCamp,setViewCamp]=useState(null);

  const handleDuplicate=(c)=>{setBuyer({name:c.buyer.replace(/\s\w\.$/,""),area:c.area,price:c.price});setS("new");};
  const handleDelete=(id)=>{setCamps(p=>p.filter(c=>c.id!==id));setViewCamp(null);};
  const handleSendDone=()=>{
    const newC={id:"c"+Date.now(),buyer:buyer?.name||"Sarah",area:buyer?.area||"Newton",price:buyer?.price||"$400K-$600K",date:"Mar 17",ago:"Just now",sent:cnt,delivered:0,transit:cnt,returned:0,status:"Sent",cost:cnt*1.12,tmpl:"Warm + Personal",owners:owners.slice(0,cnt).map(o=>({...o,del:"In transit"}))};
    setCamps(p=>[newC,...p]);setBuyer(null);setS("dash");
  };

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:C.t1}}>
    <div style={{height:52,borderBottom:"1px solid "+C.b1,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>{setViewCamp(null);setS("dash");}}><span style={{fontSize:17,fontWeight:700}}>Listing Leads</span><span style={{color:C.t3}}>/</span><span style={{fontSize:13,color:C.t2}}>Magic Buyer Letter</span></div>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <button onClick={()=>setS("setup")} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:12}}>Settings</button>
        <div style={{width:28,height:28,borderRadius:"50%",background:agent?.headshot?"transparent":C.inp,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:C.t2,overflow:"hidden"}}>{agent?.headshot?<img src={agent.headshot} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:agent?.name?agent.name.split(" ").map(n=>n[0]).join(""):"?"}</div>
      </div>
    </div>
    <div style={{maxWidth:960,margin:"0 auto",padding:"36px 32px"}}>
      {s==="setup"&&<AgentSetup initial={agent} onComplete={a=>{setAgent(a);setS("dash")}}/>}
      {s==="dash"&&!viewCamp&&<Dashboard campaigns={camps} onNew={()=>setS("new")} onView={c=>setViewCamp(c)} onDuplicate={handleDuplicate} onDelete={handleDelete}/>}
      {s==="dash"&&viewCamp&&<CampaignDetail campaign={viewCamp} onBack={()=>setViewCamp(null)} onDuplicate={c=>{setViewCamp(null);handleDuplicate(c);}} onDelete={id=>{handleDelete(id);}}/>}
      {s==="new"&&<DescribeBuyer onGo={p=>{setBuyer(p);setS("pipeline")}} onBack={()=>setS("dash")}/>}
      {s==="pipeline"&&<Pipeline buyer={buyer||{}} onDone={()=>{setOwners(mkOwn());setS("t_letter")}}/>}
      {s==="t_letter"&&<Transition label="Preparing your letter preview..." onDone={()=>setS("letter")}/>}
      {s==="letter"&&<LetterStep buyer={buyer||{name:"Sarah"}} agent={agent||{}} onNext={()=>setS("t_audience")} onBack={()=>setS("new")}/>}
      {s==="t_audience"&&<Transition label="Loading audience list..." onDone={()=>setS("audience")}/>}
      {s==="audience"&&<AudienceStep buyer={buyer||{name:"Sarah"}} owners={owners} onNext={(n,updatedOwners)=>{setCnt(n);if(updatedOwners)setOwners(updatedOwners);setS("t_send")}} onBack={()=>setS("letter")}/>}
      {s==="t_send"&&<Transition label="Preparing your order..." onDone={()=>setS("send")}/>}
      {s==="send"&&<SendStep count={cnt||92} buyer={buyer} agent={agent||{}} onBack={()=>setS("audience")} onDone={handleSendDone}/>}
    </div>
  </div>;
}
