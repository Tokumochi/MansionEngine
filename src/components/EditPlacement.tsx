import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

import { Type, DataFurniture, CroomFurniture, ProcessFurniture } from './Main';
import Import from './Import';
import RunRoom, { RoomRunInfo } from './RunRoom';

import './style.css'


type Popup = 
  | {kind: "None"}
  | {kind: "NewFur", x: number, y: number}
  | {kind: "EditFur", x: number, y: number, fur_id: string}


const socket = io("http://127.0.0.1:8080");
socket.on("connect", () => {
  console.log("connect");
});

var top_room_run_info = {} as RoomRunInfo;

function EditPlacement() {
  const { path } = useParams();

  const fur_width = 200;
  const fur_height = 120;

  const [data_furs, setDataFurs] = useState(new Map([] as [string, DataFurniture][]));
  const [process_furs, setProcessFurs] = useState(new Map([] as [string, ProcessFurniture][]));
  const [croom_furs, setCroomFurs] = useState(new Map([] as [string, CroomFurniture][]));
  const [output_source, setOutputSource] = useState({id: "-1", index: -1, type: {"kind": "number"}});

  const [isRunMode, setIsRunMode] = useState(false);

  const [popup, setPopup] = useState({kind: "None"} as Popup);
  
  useEffect(() => {
    socket.on("update data furs", (data_furs: [string, DataFurniture][]) => setDataFurs(new Map(data_furs)));
    socket.on("update process furs", (process_furs: [string, ProcessFurniture][]) => setProcessFurs(new Map(process_furs)));
    socket.on("update croom furs", (croom_furs: [string, CroomFurniture][]) => setCroomFurs(new Map(croom_furs)));

    socket.on("update output source", (id: string, index: number, type: Type) => {console.log(id, index); setOutputSource({id: id, index: index, type: type})});

    socket.on("run", (room_run_info: RoomRunInfo) => {
      top_room_run_info = room_run_info;
      setIsRunMode(true);
    });
  }, []);

  useEffect(() => {
    socket.on("update data fur", (id: string, data_fur: DataFurniture) => {
      setDataFurs(new Map(data_furs.set(id, data_fur)));
    });
  }, [data_furs]);
  useEffect(() => {
    socket.on("update process fur", (id: string, process_fur:  ProcessFurniture) => {
      setProcessFurs(new Map(process_furs.set(id, process_fur)))
    })
  }, [process_furs]);
  useEffect(() => {
    socket.on("update croom fur", (id: string, croom_fur: CroomFurniture) => {
      setCroomFurs(new Map(croom_furs.set(id, croom_fur)))
    })
  }, [croom_furs]);

  useEffect(() => {
    socket.emit("join placement", path);
  }, [path]);

  const setFurPos = (id: String, x: number, y: number) => {
    socket.emit("set fur pos", path, id, x, y);
  };

  const connectFurs = (upper_id: string, upper_index: number, lower_id: string, lower_index: number) => {
    socket.emit("connect furs", path, upper_id, upper_index, lower_id, lower_index);
  };

  const closeMenu = () => { setPopup({kind: "None"}) };

  const genDataFur = (data_path: string) => {
    if(popup.kind === "NewFur")
      socket.emit("gen data fur", path, popup.x, popup.y, data_path);
    closeMenu();
  }
  const genProcessFur = (process_path: string) => {
    if(popup.kind === "NewFur")
      socket.emit("gen process fur", path, popup.x, popup.y, process_path);
    closeMenu();
  }
  const genCroomFur = (croom_path: string) => {
    if(popup.kind === "NewFur")
      socket.emit("gen croom fur", path, popup.x, popup.y, croom_path);
    closeMenu();
  }

  const [tempFur, setTempFur] = useState({isDisplayed: false, id: "-1", x: 0, y: 0});
  const [tempUpper, setTempUpper] = useState({isDisplayed: false, id: "-1", index: -1});

  if(path === undefined) {
    console.log("not param");
    return <></>;
  }

  window.onmousemove = (e) => {
    if(tempFur.isDisplayed) {
      setTempFur({isDisplayed: true, id: tempFur.id, x: e.offsetX - fur_width / 2, y: e.offsetY - fur_height / 2});
    }
  };

  window.onmouseup = (e) => {
    if(tempFur.isDisplayed) {
      setFurPos(tempFur.id, tempFur.x, tempFur.y);
      setTempFur({isDisplayed: false, id: "-1", x: 0, y: 0});
    }
    if(tempUpper.isDisplayed) {
      setTempUpper({isDisplayed: false, id: "-1", index: -1});
    }
  };

  const run_stop_button = () => {
    if(isRunMode)
      return <button onClick={() => setIsRunMode(false)}>Stop</button>
    return <button onClick={() => socket.emit("compile", path)}>Run</button>
  }

  const place_line = (upper_x: number, upper_y: number, lower_id: string, lower_index: number) => {

    const lower_data_fur = data_furs.get(lower_id);
    if(lower_data_fur !== undefined) {
      return <line x1={upper_x} y1={upper_y} x2={lower_data_fur.x + fur_width / 2} y2={lower_data_fur.y} stroke="black" strokeWidth={10} />
    }
    const lower_process_fur = process_furs.get(lower_id);
    if(lower_process_fur !== undefined) {
      return <line x1={upper_x} y1={upper_y} x2={lower_process_fur.x + fur_width * (lower_index + 1) / (lower_process_fur.emits.length + 1)} y2={lower_process_fur.y} stroke="black" strokeWidth={10} />
    }
    const lower_croom_fur = croom_furs.get(lower_id);
    if(lower_croom_fur !== undefined) {
      return <line x1={upper_x} y1={upper_y} x2={lower_croom_fur.x + fur_width / 2} y2={lower_croom_fur.y} stroke="black" strokeWidth={10} />;
    }

    return <></>
  }

  const place_furs = () => {
    var fur_elements: JSX.Element[] = [];

    // process furs
    process_furs.forEach((process_fur, id) => {
      fur_elements.push(<g>
        <rect x={process_fur.x} y={process_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#ccaaaa" 
          onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: process_fur.x, y: process_fur.y})}
        />
        <text x={process_fur.x + fur_width / 2} y={process_fur.y + fur_height / 2} text-anchor="middle" dominant-baseline="central"
          onClick={(e) => {e.stopPropagation(); setPopup({kind: 'EditFur', x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, fur_id: id})}}
        >
          {process_fur.path.split('-').pop()}
        </text>
        {
          // inputs and lines
          process_fur.sources.map((source, index) => {
            const upper_x = process_fur.x + fur_width * (index + 1) / (process_fur.sources.length + 1);
            const upper_y = process_fur.y + fur_height;
            const source_color = (tempUpper.id === id && tempUpper.index === index) ? 'red' : 'black';

            return (
              <g>
                { place_line(upper_x, upper_y, source.id, source.index) }
                <circle cx={upper_x} cy={upper_y} r={10} fill={source_color}
                  onClick={() => setTempUpper({isDisplayed: true, id: id, index: index})}
                />
              </g>
            )
          })
        }
        {
          // outputs
          process_fur.emits.map((emit, index) => {
            return <circle cx={process_fur.x + fur_width * (index + 1) / (process_fur.emits.length + 1)} cy={process_fur.y} r={10}
              onMouseUp={() => {
                if(tempUpper.isDisplayed) {
                  connectFurs(tempUpper.id, tempUpper.index, id, index);
                }
              }}
            />
          })
        }
      </g>)
    })

    // data furs
    data_furs.forEach((data_fur, id) => {
      fur_elements.push(<g>
        <rect x={data_fur.x} y={data_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaccaa"
          onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: data_fur.x, y: data_fur.y})} 
        />
        <text x={data_fur.x + fur_width / 2} y={data_fur.y + fur_height / 2} text-anchor="middle" dominant-baseline="central"
          onClick={(e) => {e.stopPropagation(); setPopup({kind: 'EditFur', x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, fur_id: id})}}
        >
          {data_fur.path.split('-').pop()}
        </text>
        <circle cx={data_fur.x + fur_width / 2} cy={data_fur.y} r={10} 
          onMouseUp={() => {
            if(tempUpper.isDisplayed) {
              connectFurs(tempUpper.id, tempUpper.index, id, 0);
            }
          }}
        />
      </g>)
    })

    // croom furs
    croom_furs.forEach((croom_fur, id) => {
      fur_elements.push(<g>
        <rect x={croom_fur.x} y={croom_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaaacc"
          onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: croom_fur.x, y: croom_fur.y})} 
        />
        <text x={croom_fur.x + fur_width / 2} y={croom_fur.y + fur_height / 2} text-anchor="middle" dominant-baseline="central"
          onClick={(e) => {e.stopPropagation(); setPopup({kind: 'EditFur', x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, fur_id: id})}}
        >
          {croom_fur.path.split('-').pop()}
        </text>
        <circle cx={croom_fur.x + fur_width / 2} cy={croom_fur.y} r={10} 
          onMouseUp={() => {
            if(tempUpper.isDisplayed) {
              connectFurs(tempUpper.id, tempUpper.index, id, 0);
            }
          }}
        />
      </g>)
    })

    return fur_elements;
  }

  return (
    <>
    	<header style={{display: 'flex', justifyContent: 'space-evenly'}}>
        { run_stop_button() }
	    	<button onClick={() => socket.emit("save placement", path)}>Save</button>
      </header>
      <svg width={window.screen.width} height={window.screen.height} xmlns="http://www.w3.org/2000/svg"
        onContextMenu={(e) => {e.preventDefault(); setPopup({kind: 'NewFur', x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY})}}
      >
        {
          // outputの表示j
          <g>
            <rect x={(window.screen.width - fur_width) / 2} y={-fur_height / 2} width={fur_width} height={fur_height} rx="5" ry="5" fill="#8888cc" />
            { place_line(window.screen.width / 2, fur_height / 2, output_source.id, output_source.index) }
            <circle cx={window.screen.width / 2} cy={fur_height / 2} r={10} fill={(tempUpper.id === "output" && tempUpper.index === 0) ? 'red' : 'black'}
              onClick={() => setTempUpper({isDisplayed: true, id: "output", index: 0})}
            />
          </g>
        }
        { place_furs() }
        { 
          // Furnitureの新規作成にあたってダミーの表示
          tempFur.isDisplayed && 
          <rect x={tempFur.x} y={tempFur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaaaaaaa"/>
        }
      </svg>
      {
        // Furnitureの新規作成ポップアップ
        popup.kind === 'NewFur' &&
        <div className='import_popup' style={{
          left: popup.x - 50, top: popup.y - 50
        }} onMouseLeave={closeMenu}>
          <Import path={path} width={600} height={400} clickType={() => {}} clickData={genDataFur} clickProcess={genProcessFur} clickRoom={genCroomFur} />
        </div>
      }
      {
        // Furnitureの編集ポップアップ
        popup.kind === 'EditFur' &&
        <div className='edit_fur_popup' style={{
          left: popup.x - 50, top: popup.y - 50, background: "#9999aa"
        }} onMouseLeave={closeMenu}>
          <button onClick={() => {socket.emit("delete fur", path, popup.fur_id); closeMenu();}}>削除</button>
        </div>
      }
      {
        // 実行時
        isRunMode &&
        <div style={{position: 'absolute', border: 'solid', left: 20, top: 40, width: 500, height: 250}}>
          <RunRoom top_room_run_info={top_room_run_info}></RunRoom>
        </div>
      }
    </>
  );
}

export default EditPlacement;