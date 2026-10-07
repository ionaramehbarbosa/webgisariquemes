'use strict';
(()=>{
const mapa=window.geoportalMapa;if(!mapa)return;
const el=id=>document.getElementById(id);let camada=null,resultado=null,consultado=false;
const periods={hoje:'focos_hoje_br_todosats',h48:'focos_48h_br_todosats',mes:'focos_mesatual_br_todosats'};
const endpoint='https://terrabrasilis.dpi.inpe.br/queimadas/geoserver/ows';
const msg=el('focosStatus');
function popup(f){const p=f.properties||{},div=document.createElement('div'),h=document.createElement('h3');h.textContent='Foco de fogo ativo · INPE';div.append(h);const campos={'Data e hora (UTC)':p.data_hora_gmt,'Satélite':p.satelite,'Município atribuído pelo INPE':p.municipio,'Bioma':p.bioma,'FRP (valor original)':p.frp,'Latitude':p.latitude,'Longitude':p.longitude};const t=document.createElement('table');t.className='attrs';for(const[k,v]of Object.entries(campos)){const r=t.insertRow();r.insertCell().textContent=k;r.insertCell().textContent=v==null?'Não informado':String(v);}div.append(t);return div;}
el('consultarFocos').onclick=async()=>{
 if(consultado&&Date.now()-consultado<30000){msg.textContent='Aguarde 30 segundos entre consultas ao INPE.';return;}
 const period=el('periodoFocos').value;if(!periods[period])return;
 const btn=el('consultarFocos');btn.disabled=true;msg.textContent='Consultando o INPE…';const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
 try{
  const params=new URLSearchParams({service:'WFS',version:'1.0.0',request:'GetFeature',typeName:'dados_abertos:'+periods[period],outputFormat:'application/json',srsName:'EPSG:4326',CQL_FILTER:"municipio ILIKE 'ARIQUEMES' AND estado ILIKE 'RONDÔNIA'",maxFeatures:'5001'});
  const r=await fetch(endpoint+'?'+params,{signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();if(d.type!=='FeatureCollection'||!Array.isArray(d.features))throw Error('Resposta incompatível');
  if(d.features.length>5000||Number(d.totalFeatures)>5000)throw Error('Consulta acima de 5.000 focos. Escolha um período menor.');
  const features=d.features.filter(f=>f.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length>=2&&f.geometry.coordinates.every(Number.isFinite)&&Math.abs(f.geometry.coordinates[0])<=180&&Math.abs(f.geometry.coordinates[1])<=90);
  resultado={type:'FeatureCollection',features};if(camada)mapa.removeLayer(camada);
  camada=L.geoJSON(resultado,{pointToLayer:(_,ll)=>L.circleMarker(ll,{radius:6,color:'#8e260e',weight:1.5,fillColor:'#ff6b24',fillOpacity:.9}),onEachFeature:(f,l)=>l.bindPopup(popup(f))});
  el('mostrarFocos').checked=true;camada.addTo(mapa);consultado=Date.now();
  const label=el('periodoFocos').selectedOptions[0].textContent;
  msg.textContent=features.length+' detecções · '+label+'. Consultado em '+new Date().toLocaleString('pt-BR')+'.'+(features.length===0?' Nenhum foco retornado para o período.':'')+(features.length<d.features.length?' Alguns registros com coordenadas incompatíveis foram descartados.':'');
  el('baixarFocos').disabled=false;el('verFocos').disabled=!features.length;
 }catch(e){msg.textContent='Não foi possível atualizar os focos. '+(e.name==='AbortError'?'O INPE demorou para responder.':e.message)+' Tente novamente mais tarde.'+(resultado?' A consulta anterior foi mantida.':'');console.error('Consulta INPE:',e);}
 finally{clearTimeout(timeout);btn.disabled=false;}
};
el('mostrarFocos').onchange=()=>{if(!camada)return;el('mostrarFocos').checked?camada.addTo(mapa):mapa.removeLayer(camada);};
el('verFocos').onclick=()=>{if(camada&&camada.getBounds().isValid()){el('mostrarFocos').checked=true;camada.addTo(mapa);mapa.fitBounds(camada.getBounds(),{padding:[30,30],maxZoom:14});}};
el('baixarFocos').onclick=()=>{if(!resultado)return;const u=URL.createObjectURL(new Blob([JSON.stringify(resultado)],{type:'application/geo+json'})),a=document.createElement('a');a.href=u;a.download='focos_INPE_ariquemes.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
})();
