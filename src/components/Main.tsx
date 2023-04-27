import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';

import { EditData } from './EditData'
import { EditType } from './EditType';
import EditPlacement from './EditPlacement';
import { PathDirectory, Directory } from './Directory';
import EditProcess from './EditProcess';
import RunRoom from './RunRoom';


export type Type =
| {kind: "number"}
| {kind: "string"}
| {kind: "array", base_type: Type}
| {kind: "obj", pros: [string, Type][]}; // Object

export interface Process {
  params: {name: string, type: Type}[],
  rets: {name: string, type: Type}[],
  code: string,
}

export interface Croom {
  //outputs: DataType[],
}

export interface Furniture {
  x: number,
  y: number,
  path: string,
}

export interface DataFurniture extends Furniture {
}

export interface ProcessFurniture extends Furniture {
  sources: {
      id: string,
      index: number,
  }[],
  emits: Type[],
}

export interface CroomFurniture extends Furniture {
}

function PageRoute() {

  return (
    <Routes>
      <Route path='/' element={<Directory path={''} />}/>
      <Route path=':path/' element={<PathDirectory />}/>
      <Route path=':path/type' element={<EditType />}/>
      <Route path=':path/data' element={<EditData />}/>
      <Route path=':path/process' element={<EditProcess />}/>
      <Route path=':path/placement' element={<EditPlacement />}/>
      <Route path=':path/runroom' element={<RunRoom />}/>
    </Routes>
  );
}
/*
function RouteRoom() {

  const { dir_path } = useParams();

  if(dir_path === undefined) {
    console.log("not param");
    return <></>;
  }

  return 

  return <Placement path={room_path} />
}
*/
export default PageRoute;