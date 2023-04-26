import { Process, Type } from './Main'
import { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import { io } from 'socket.io-client';

import './style.css'

const socket = io("http://127.0.0.1:8080");
socket.on("connect", () => {
  console.log("connect");
});

function EditProcess() {
  const { path } = useParams();

  const [params_str, setParamsStr] = useState(""); // obj型でなくてはならない
  const [rets_str, setRetsStr] = useState(""); // obj型でなくてはならない
  const [code, setCode] = useState("");

  useEffect(() => {
    socket.on("update params str", (params_str: string) => { setParamsStr(params_str); });
    socket.on("update rets str", (rets_str: string) => { setRetsStr(rets_str); });
    socket.on("update code", (code: string) => { setCode(code); });
  }, []);

  useEffect(() => {
    socket.emit("join process", path);
  }, [path]);

  return <>
		<header style={{display: 'flex', justifyContent: 'space-evenly'}}>
			<button onClick={() => socket.emit("save process", path, {params_str: params_str, rets_str: rets_str, code: code})}>Save</button>
		</header>
    <textarea cols={150} rows={10} value={params_str} onChange={(e) => setParamsStr(e.target.value)} />
    <textarea cols={150} rows={30} value={code} onChange={(e) => setCode(e.target.value)} />
    <textarea cols={150} rows={10} value={rets_str} onChange={(e) => setRetsStr(e.target.value)} />
  </>
}

export default EditProcess;