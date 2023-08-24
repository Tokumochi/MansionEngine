import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

import { Type, DataFurniture, CroomFurniture, ProcessFurniture } from './Main';
import Import from './Import';
import RunRoom, { RoomRunInfo } from './RunRoom';

import './style.css'


type Popup = 
  | {is_displayed: false}
  | {is_displayed: true, x: number, y: number}

const socket = io("http://127.0.0.1:8080");
socket.on("connect", () => {
  console.log("connect");
});

var top_room_run_info = {} as RoomRunInfo;

var current_over_fur = "";

function EditPlacement() {
  const { path } = useParams();

  const fur_width = 280;
  const fur_height = 100;

  const [data_furs, setDataFurs] = useState(new Map([] as [string, DataFurniture][]));
  const [process_furs, setProcessFurs] = useState(new Map([] as [string, ProcessFurniture][]));
  const [croom_furs, setCroomFurs] = useState(new Map([] as [string, CroomFurniture][]));
  const [output_sources, setOutputSources] = useState([] as {id: string, index: number, type: Type}[]);

  //const [isRunMode, setIsRunMode] = useState(false);

  const [popup, setPopup] = useState({is_displayed: false} as Popup);
  
  useEffect(() => {
    socket.on("update data furs", (data_furs: [string, DataFurniture][]) => setDataFurs(new Map(data_furs)));
    socket.on("update process furs", (process_furs: [string, ProcessFurniture][]) => setProcessFurs(new Map(process_furs)));
    socket.on("update croom furs", (croom_furs: [string, CroomFurniture][]) => setCroomFurs(new Map(croom_furs)));

    socket.on("update output sources", (output_sources: {id: string, index: number, type: Type}[]) => {setOutputSources(output_sources)});
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

  const closeMenu = () => { setPopup({is_displayed: false}) };

  const genDataFur = (data_path: string) => {
    if(popup.is_displayed)
      socket.emit("gen data fur", path, popup.x, popup.y, data_path);
    closeMenu();
  }
  const genProcessFur = (process_path: string) => {
    if(popup.is_displayed)
      socket.emit("gen process fur", path, popup.x, popup.y, process_path);
    closeMenu();
  }
  const genCroomFur = (croom_path: string) => {
    if(popup.is_displayed)
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
      setTempFur({isDisplayed: true, id: tempFur.id, x: e.pageX - fur_width / 2, y: e.pageY - fur_height / 2});
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
      return <line x1={upper_x} y1={upper_y} x2={lower_croom_fur.x + fur_width * (lower_index + 1) / (lower_croom_fur.emits.length + 1)} y2={lower_croom_fur.y} stroke="black" strokeWidth={10} />;
    }

    return <></>
  }

  const place_furs = () => {
    var fur_elements: JSX.Element[] = [];

    // process furs
    process_furs.forEach((process_fur, id) => {
      fur_elements.push(<g>
        <rect x={process_fur.x} y={process_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#eeaaaa" stroke='black' strokeWidth={5}
          onMouseEnter={() => {current_over_fur = id}}
          onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: process_fur.x, y: process_fur.y})} 
        />
        <text x={process_fur.x + fur_width / 2} y={process_fur.y + fur_height / 2} text-anchor="middle" dominant-baseline="central">
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
        <rect x={data_fur.x} y={data_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaccaa" stroke='black' strokeWidth={5}
          onMouseEnter={() => {current_over_fur = id}}
          onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: data_fur.x, y: data_fur.y})} 
        />
        <text x={data_fur.x + fur_width / 2} y={data_fur.y + fur_height / 2} text-anchor="middle" dominant-baseline="central">
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
        <rect x={croom_fur.x} y={croom_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaaadd" stroke='black' strokeWidth={5}
          onMouseEnter={() => {current_over_fur = id}}
          onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: croom_fur.x, y: croom_fur.y})} 
        />
        <text x={croom_fur.x + fur_width / 2} y={croom_fur.y + fur_height / 2} text-anchor="middle" dominant-baseline="central">
          {croom_fur.path.split('-').pop()}
        </text>
        {
          croom_fur.emits.map((_, index) => {
            return <circle cx={croom_fur.x + fur_width * (index + 1) / (croom_fur.emits.length + 1)} cy={croom_fur.y} r={10} 
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

    return fur_elements;
  }

  const display_popup = () => {
    if(popup.is_displayed) {
      switch(current_over_fur) {
        case "":
          // Furnitureの新規作成ポップアップ
          return <div className='position-absolute' style={{left: popup.x - 50, top: popup.y - 50}} onMouseLeave={closeMenu}>
            <Import path={path} width={600} height={400} clickType={() => {}} clickData={genDataFur} clickProcess={genProcessFur} clickRoom={genCroomFur} />
          </div>
        case "output":
          // Outputの編集ポップアップ
          return <div className='position-absolute border border-dark bg-light' style={{left: popup.x - 20, top: popup.y - 5}} onMouseLeave={closeMenu}>
            <button className='btn btn-secondary rounded-0 w-100' onClick={() => socket.emit("increment output sources", path)}>出力数を増やす</button>
            <button className='btn btn-secondary rounded-0 w-100' onClick={() => socket.emit("decrement output sources", path)}>出力数を減らす</button>
          </div>
        default:
          // Furnitureの編集ポップアップ
          return <div className='position-absolute border border-dark bg-light' style={{left: popup.x - 20, top: popup.y - 5}} onMouseLeave={closeMenu}>
            <button className='btn btn-secondary rounded-0 w-100' onClick={() => {socket.emit("delete fur", path, current_over_fur); closeMenu();}}>削除</button>
          </div>
      }
    }
    return <></>
  }

  return (
    <>
    	<header style={{display: 'flex', justifyContent: 'space-evenly'}}>
        <button onClick={() => window.open('/' + path + '/runroom')}>Run</button>
	    	<button onClick={() => socket.emit("save placement", path)}>Save</button>
      </header>
      <svg width={window.screen.width} height={window.screen.height} xmlns="http://www.w3.org/2000/svg"
        onContextMenu={(e) => {e.preventDefault(); setPopup({is_displayed: true, x: e.pageX, y: e.pageY});}}
      >
        <rect width={window.screen.width} height={window.screen.height} fill="white" onMouseEnter={() => {current_over_fur = ""}}></rect>
        {
          // outputの表示
          <g>
            <rect x={(window.screen.width - fur_width) / 2} y={-fur_height / 2} width={fur_width} height={fur_height} rx="5" ry="5" fill="#8888cc" stroke='black' strokeWidth={5}
              onMouseEnter={() => {current_over_fur = "output"}}
            />
            {
              output_sources.map((output_source, index) => {
                const upper_x = (window.screen.width - fur_width) / 2 + fur_width * (index + 1) / (output_sources.length + 1);
                const upper_y = fur_height / 2;
                const source_color = (tempUpper.id === "output" && tempUpper.index === index) ? 'red' : 'black';
    
                return <g>
                  { place_line(upper_x, upper_y, output_source.id, output_source.index) }
                  <circle cx={upper_x} cy={upper_y} r={10} fill={source_color}
                    onClick={() => setTempUpper({isDisplayed: true, id: "output", index: index})}
                  />
                </g>
              })
            }
          </g>
        }
        { place_furs() }
        { 
          // Furnitureの新規作成にあたってダミーの表示
          tempFur.isDisplayed && 
          <rect x={tempFur.x} y={tempFur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaaaaaaa"/>
        }
      </svg>
      { display_popup() }
     </>
  );
}

export default EditPlacement;