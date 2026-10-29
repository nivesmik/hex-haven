// UI experiment flag only; the portable engine retains undo for tests/recovery.
export const undoEnabled=search=>new URLSearchParams(search).get('testUndo')==='1';
export function configureUndo(document,search){
 const enabled=undoEnabled(search);document.getElementById('undo').hidden=!enabled;
 if(enabled)for(const link of document.querySelectorAll('a[href="index-2d.html"],a[href="index.html"]'))link.href+='?testUndo=1';
 return enabled;
}
