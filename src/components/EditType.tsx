import { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import { io } from 'socket.io-client';

import './style.css'

const socket = io("http://127.0.0.1:8080");
socket.on("connect", () => {
  console.log("connect");
});

export function EditType() {
  const { path } = useParams();

  const [type_str, setTypeStr] = useState('number');

  useEffect(() => {
    socket.on("update type str", (type_str: string) => setTypeStr(type_str));
  }, []);

  useEffect(() => {
    socket.emit("join type", path);
  }, [path]);

  return (
    <>
      <header style={{display: 'flex', justifyContent: 'space-evenly'}}>
        <button onClick={() => socket.emit("save type str", path, type_str)}>Save</button>
      </header>
      <textarea cols={100} rows={30} value={type_str} onChange={(e) => setTypeStr(e.target.value)} />
    </>
  )
}