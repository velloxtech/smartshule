import React from 'react';
import {recoverModuleLoad} from '../../utils/chunkRecovery';

type Props={children:React.ReactNode;resetKey?:string;onHome?:()=>void};
export class AppErrorBoundary extends React.Component<Props,{error:Error|null}>{
  declare props:Props;
  declare setState:(state:{error:Error|null})=>void;
  state:{error:Error|null}={error:null};
  static getDerivedStateFromError(error:Error){return {error};}
  componentDidCatch(error:Error){console.error('Portal view failed:',error);recoverModuleLoad(error);}
  componentDidUpdate(previous:Props){if(previous.resetKey!==this.props.resetKey&&this.state.error)this.setState({error:null});}
  render(){
    if(!this.state.error)return this.props.children;
    return <section role="alert" className="mx-auto my-8 max-w-xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-on-surface shadow-sm"><h1 className="text-xl font-bold">This page could not load</h1><p className="mt-3 text-sm text-on-surface-variant">Your saved work is kept. Retry the page, or reload the portal if your connection was interrupted or an update became available.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" className="ui-button ui-button-primary" onClick={()=>this.setState({error:null})}>Retry page</button>{this.props.onHome&&<button type="button" className="ui-button" onClick={this.props.onHome}>Back to dashboard</button>}<button type="button" className="ui-button" onClick={()=>window.location.reload()}>Reload portal</button></div></section>;
  }
}
