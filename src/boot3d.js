try{
  await import('./main3d.js');
}catch(error){
  console.error(error);
  const note=document.getElementById('message');
  note.textContent='3D 화면을 시작하지 못했습니다. 2D 보기로 플레이할 수 있습니다.';
  const fallback=document.createElement('a');fallback.href='index-2d.html';fallback.textContent='2D 보기로 이동';
  fallback.style.cssText='position:fixed;z-index:20;top:45%;left:25%;padding:16px;background:white;border-radius:12px;color:#244a39';
  document.body.appendChild(fallback);
}
