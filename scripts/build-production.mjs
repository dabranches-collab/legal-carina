import {spawnSync} from 'node:child_process'
import {loadEnv} from 'vite'
import {pathToFileURL} from 'node:url'
import {checkDeployEnvironment} from './check-deploy-env.mjs'

// A navegação publicada é parte da release, não uma opção da sessão de terminal.
export function productionBuildEnvironment(environment) {
 return {...environment, VITE_WORKFLOW_NAVIGATION:'five-areas'}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const environment=productionBuildEnvironment({...loadEnv('production',process.cwd(),'VITE_'),...process.env})
 checkDeployEnvironment(environment)
 console.log('Production Auth configuration verified; five-area navigation enabled; values omitted.')
 for(const [script,args] of [['./node_modules/typescript/bin/tsc',['-b']],['./node_modules/vite/bin/vite.js',['build']]]){
  const result=spawnSync(process.execPath,[script,...args],{env:environment,stdio:'inherit'})
  if(result.error)throw result.error
  if(result.status!==0)process.exit(result.status??1)
 }
}
