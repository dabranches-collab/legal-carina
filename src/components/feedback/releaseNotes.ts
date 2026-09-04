export type ReleaseEntry={version:string;changes:string[]}
export type ReleaseNotes=ReleaseEntry&{releases?:ReleaseEntry[]}

function compareVersions(left:string,right:string){
  const leftParts=left.split('.').map(Number),rightParts=right.split('.').map(Number)
  for(let index=0;index<Math.max(leftParts.length,rightParts.length);index++){
    const difference=(leftParts[index]||0)-(rightParts[index]||0)
    if(difference)return difference
  }
  return 0
}

export function changesSince(release:ReleaseNotes,fromVersion:string|null){
  if(!fromVersion)return release.changes
  if(compareVersions(release.version,fromVersion)<=0)return []
  const changes=release.releases
    ?.filter(entry=>compareVersions(entry.version,fromVersion)>0&&compareVersions(entry.version,release.version)<=0)
    .sort((left,right)=>compareVersions(left.version,right.version))
    .flatMap(entry=>entry.changes)
  return changes?.length?changes:release.changes
}
