export function debug(o:any) {if(process.env.VERBOSE) {console.debug(JSON.stringify(o, null, 2))}}
export function warn(m:string) {/*if(process.env.VERBOSE)*/ console.warn(m)}
export function log(m:string) {if(process.env.VERBOSE) {console.log(m)}}
export function info(o:any) {console.info(o)}
export function error(m:string, o?:any) {if(process.env.VERBOSE) {console.error(m, o)} else {{console.error(m)}}}
