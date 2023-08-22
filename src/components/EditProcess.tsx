import { Process, Type } from './Main'
import { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import { io } from 'socket.io-client';
import { Editor, EditorState, ContentState } from "draft-js";

import './style.css';
import "draft-js/dist/Draft.css";

const socket = io("http://127.0.0.1:8080");
socket.on("connect", () => {
  console.log("connect");
});

function EditProcess() {
  const { path } = useParams();

  const [params, setParams] = useState(() => EditorState.createEmpty()); // obj型でなくてはならない
  const [rets, setRets] = useState(() => EditorState.createEmpty()); // obj型でなくてはならない
  const [code, setCode] = useState(() => EditorState.createEmpty());

  useEffect(() => {
    socket.on("update params str", (params_str: string) => { setParams(EditorState.createWithContent(ContentState.createFromText(params_str))); });
    socket.on("update rets str", (rets_str: string) => { setRets(EditorState.createWithContent(ContentState.createFromText(rets_str))); });
    socket.on("update code", (code_str: string) => { setCode(EditorState.createWithContent(ContentState.createFromText(code_str)))});
  }, []);

  useEffect(() => {
    socket.emit("join process", path);
  }, [path]);

  return <>
		<header style={{display: 'flex', justifyContent: 'space-evenly'}}>
			<button onClick={() => socket.emit("save process", path, {params_str: params.getCurrentContent().getPlainText(), rets_str: rets.getCurrentContent().getPlainText(), code: code.getCurrentContent().getPlainText()})}>Save</button>
		</header>
    <div style={{margin: 10, padding: 5, borderRadius: 5, border: 'solid'}}>
      <Editor placeholder="params(object)" editorState={params} onChange={setParams} />
    </div>
    <div style={{margin: 10, padding: 5, borderRadius: 5, border: 'solid'}}>
      <Editor placeholder="code" editorState={code} onChange={setCode} />
    </div>
    <div style={{margin: 10, padding: 5, borderRadius: 5, border: 'solid'}}>
      <Editor placeholder="rets(object)" editorState={rets} onChange={setRets} />
    </div>
  </>
}

export default EditProcess;