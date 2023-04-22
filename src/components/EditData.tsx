import { useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import { io } from 'socket.io-client';

import { Type } from "./Main";
import Import from './Import';

import './style.css'

const socket = io("http://127.0.0.1:8080");
socket.on("connect", () => {
  console.log("connect");
});

export function EditData() {
  const { path } = useParams();

  const [data_str, setDataStr] = useState('0');

  const [is_import_menu_displayed, setIsImportMenuDisplayed] = useState(false);

  useEffect(() => {
    socket.on("update data str", (data_str: string) => setDataStr(data_str));
  }, []);

  useEffect(() => {
    socket.emit("join data", path);
  }, [path]);


  if(path === undefined) {
    console.log("not param");
    return <></>;
  }

  return (
    <>
      <header style={{display: 'flex', justifyContent: 'space-evenly'}}>
        <button onClick={() => socket.emit("save data str", path, data_str)}>Save</button>
        <button onClick={() => setIsImportMenuDisplayed(true)}>Import</button>
      </header>
      <textarea cols={100} rows={30} value={data_str} onChange={(e) => setDataStr(e.target.value)} />
      {
        is_import_menu_displayed &&
        <div style={{
          position: 'absolute', overflow: 'scroll', left: 50, top: 50, background: "#9999aa"
        }} onMouseLeave={() => {
          setIsImportMenuDisplayed(false);
        }}>
          <Import path={path.slice(0, path.lastIndexOf('-'))} width={600} height={400} clickType={(type_path: string) => {
            socket.emit("import type to data", type_path);
            setIsImportMenuDisplayed(false);
          }} clickData={() => {}} clickProcess={() => {}} clickRoom={() => {}} />
        </div>
      }
    </>
  )
}

export default EditData;