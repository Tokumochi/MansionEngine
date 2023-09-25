import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

import { Type, DataFurniture, CroomFurniture, ProcessFurniture } from './Main';
import Import from './Import';
import RunRoom, { RoomRunInfo } from './RunRoom';

import './style.css'
import { debug } from 'console';


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

  const [debugs, setDebugs] = useState(new Map([] as [string, {
    data_furs: Map<string, DataFurniture>,
    process_furs: Map<string, ProcessFurniture>,
    croom_furs: Map<string, CroomFurniture>,
    process_connects: Map<string, {id: string, index: number}>
  }][]));

  const [target_debug, setTargetDebug] = useState("");

  const [popup, setPopup] = useState({is_displayed: false} as Popup);
  
  useEffect(() => {
    socket.on("update data furs", (data_furs: [string, DataFurniture][]) => setDataFurs(new Map(data_furs)));
    socket.on("update process furs", (process_furs: [string, ProcessFurniture][]) => setProcessFurs(new Map(process_furs)));
    socket.on("update croom furs", (croom_furs: [string, CroomFurniture][]) => setCroomFurs(new Map(croom_furs)));
    socket.on("update output sources", (output_sources: {id: string, index: number, type: Type}[]) => {setOutputSources(output_sources)});

    socket.on("update debugs", (debugs: [string, {
      data_furs: [string, DataFurniture][],
      process_furs: [string, ProcessFurniture][],
      croom_furs: [string, CroomFurniture][],
      process_connects: [string, {id: string, index: number}][]
    }][]) => setDebugs(
      new Map(debugs.map(debug => [
        debug[0], {
          data_furs: new Map(debug[1].data_furs),
          process_furs: new Map(debug[1].process_furs),
          croom_furs: new Map(debug[1].croom_furs),
          process_connects: new Map(debug[1].process_connects)
        }
      ]))
    ));
  }, []);

  useEffect(() => {
    socket.on("update data fur", (id: string, data_fur: DataFurniture | null) => {
      if(data_fur === null) data_furs.delete(id);
      else data_furs.set(id, data_fur);
      setDataFurs(new Map(data_furs));
    });
  }, [data_furs]);
  useEffect(() => {
    socket.on("update process fur", (id: string, process_fur:  ProcessFurniture | null) => {
      if(process_fur === null) {
        Array.from(debugs.values()).forEach(debug => {
          debug.process_connects.forEach((source, connect_id) => {
            if(id === source.id) debug.process_connects.delete(connect_id);
          });
        });
        process_furs.delete(id);
      }
      else process_furs.set(id, process_fur);
      setProcessFurs(new Map(process_furs));
    })
  }, [process_furs]);
  useEffect(() => {
    socket.on("update croom fur", (id: string, croom_fur: CroomFurniture | null) => {
      if(croom_fur === null) croom_furs.delete(id);
      else croom_furs.set(id, croom_fur);
      setCroomFurs(new Map(croom_furs))
    })
  }, [croom_furs]);

  useEffect(() => {
    socket.on("update debug", (debug_name: string) => {
      setDebugs(new Map(debugs.set(debug_name, {
        data_furs: new Map(),
        process_furs: new Map(),
        croom_furs: new Map(),
        process_connects: new Map()
      })))
    });

    socket.on("update debug data fur", (debug_name: string, id: string, data_fur: DataFurniture | null) => {
      const debug = debugs.get(debug_name);
      if(debug === undefined) return;
      if(data_fur === null) debug.data_furs.delete(id);
      else debug.data_furs.set(id, data_fur);
      setDebugs(new Map(debugs));
    });

    socket.on("update debug process fur", (debug_name: string, id: string, process_fur: ProcessFurniture | null) => {
      const debug = debugs.get(debug_name);
      if(debug === undefined) return;
      if(process_fur === null) {
        debug.process_connects.forEach((source, connect_id) => {
          if(source.id === id) debug.process_connects.delete(connect_id);
        });
        debug.process_furs.delete(id);
      }
      else debug.process_furs.set(id, process_fur);
      setDebugs(new Map(debugs));
    });

    socket.on("update debug croom fur", (debug_name: string, id: string, croom_fur: CroomFurniture | null) => {
      const debug = debugs.get(debug_name);
      if(debug === undefined) return;
      if(croom_fur === null) debug.croom_furs.delete(id);
      else debug.croom_furs.set(id, croom_fur);
      setDebugs(new Map(debugs));
    });

    socket.on("update debug process connect", (debug_name: string, process_id: string, process_index: number, lower_id: string, lower_index: number) => {
      const debug = debugs.get(debug_name);
      if(debug === undefined) return;
      debug.process_connects.set(process_id + '-' + process_index, {id: lower_id, index: lower_index});
      setDebugs(new Map(debugs));
    });
  }, [debugs]);

  useEffect(() => {
    socket.emit("join placement", path);
  }, [path]);

  const setFurPos = (id: String, x: number, y: number) => {
    if(target_debug === "")
      socket.emit("set fur pos", path, id, x, y);
    else
      socket.emit("set debug fur pos", path, target_debug, id, x, y);
  };

  const connectFurs = (upper_id: string, upper_index: number, lower_id: string, lower_index: number) => {
    if(target_debug === "") socket.emit("connect furs", path, upper_id, upper_index, lower_id, lower_index);
    else socket.emit("connect furs for debug", path, target_debug, upper_id, upper_index, lower_id, lower_index);
  };

  const closeMenu = () => { setPopup({is_displayed: false}) };

  const genDataFur = (data_path: string) => {
    if(popup.is_displayed) {
      if(target_debug === "")
        socket.emit("gen data fur", path, popup.x, popup.y, data_path);
      else
        socket.emit("gen debug data fur", path, target_debug, popup.x, popup.y, data_path)
    }
    closeMenu();
  }
  const genProcessFur = (process_path: string) => {
    if(popup.is_displayed) {
      if(target_debug === "")
        socket.emit("gen process fur", path, popup.x, popup.y, process_path);
      else
        socket.emit("gen debug process fur", path, target_debug, popup.x, popup.y, process_path)
    }
    closeMenu();
  }
  const genCroomFur = (croom_path: string) => {
    if(popup.is_displayed) {
      if(target_debug === "")
        socket.emit("gen croom fur", path, popup.x, popup.y, croom_path);
      else
        socket.emit("gen debug croom fur", path, target_debug, popup.x, popup.y, croom_path)
    }
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

  const line_with_border = (upper_x: number, upper_y: number, lower_x: number, lower_y: number, line_color: string) => {
    return <>
      <line x1={upper_x} y1={upper_y} x2={lower_x} y2={lower_y} stroke='black' strokeWidth={14}></line>
      <line x1={upper_x} y1={upper_y} x2={lower_x} y2={lower_y} stroke={line_color} strokeWidth={10}></line>
    </>
  }

  const place_line = (upper_x: number, upper_y: number, lower_id: string, lower_index: number, line_color: string = "black") => {
    const lower_data_fur = data_furs.get(lower_id);
    if(lower_data_fur !== undefined) {
      return line_with_border(upper_x, upper_y, lower_data_fur.x + fur_width / 2, lower_data_fur.y, line_color);
    }
    const lower_process_fur = process_furs.get(lower_id);
    if(lower_process_fur !== undefined) {
      return line_with_border(upper_x, upper_y, lower_process_fur.x + fur_width * (lower_index + 1) / (lower_process_fur.emits.length + 1), lower_process_fur.y, line_color);
    }
    const lower_croom_fur = croom_furs.get(lower_id);
    if(lower_croom_fur !== undefined) {
      return line_with_border(upper_x, upper_y, lower_croom_fur.x + fur_width * (lower_index + 1) / (lower_croom_fur.emits.length + 1), lower_croom_fur.y, line_color);
    }

    const debug = debugs.get(target_debug);
    if(debug !== undefined) {
      const lower_data_fur = debug.data_furs.get(lower_id);
      if(lower_data_fur !== undefined) {
        return line_with_border(upper_x, upper_y, lower_data_fur.x + fur_width / 2, lower_data_fur.y, line_color);
      }
      const lower_process_fur = debug.process_furs.get(lower_id);
      if(lower_process_fur !== undefined) {
        return line_with_border(upper_x, upper_y, lower_process_fur.x + fur_width * (lower_index + 1) / (lower_process_fur.emits.length + 1), lower_process_fur.y, line_color);
      }
      const lower_croom_fur = debug.croom_furs.get(lower_id);
      if(lower_croom_fur !== undefined) {
        return line_with_border(upper_x, upper_y, lower_croom_fur.x + fur_width * (lower_index + 1) / (lower_croom_fur.emits.length + 1), lower_croom_fur.y, line_color);
      }
    }

    return <></>
  }

  const place_main_furs = () => {
    const fur_elements: JSX.Element[] = [];

    // process furs
    process_furs.forEach((process_fur, id) => {
      fur_elements.push(<g>
        {
          target_debug === "" ?
          <rect x={process_fur.x} y={process_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#eeaaaa" stroke='black' strokeWidth={5}
            onMouseEnter={() => {current_over_fur = id}}
            onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: process_fur.x, y: process_fur.y})} 
          /> :
          <rect x={process_fur.x} y={process_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#995555" stroke='black' strokeWidth={5}/>
        }
        <text x={process_fur.x + fur_width / 2} y={process_fur.y + fur_height / 2} text-anchor="middle" dominant-baseline="central">
          {process_fur.path.split('-').pop()}
        </text>
        {
          // inputs and lines
          process_fur.sources.map((source, index) => {
            const upper_x = process_fur.x + fur_width * (index + 1) / (process_fur.sources.length + 1);
            const upper_y = process_fur.y + fur_height;
            const source_color = (tempUpper.id === id && tempUpper.index === index) ? 'red' : 'black';

            const debug = debugs.get(target_debug);
            if(debug !== undefined) {
              const process_connect = debug.process_connects.get(id + '-' + index);
              if(process_connect !== undefined) {
                return (
                  <g>
                    { place_line(upper_x, upper_y, source.id, source.index, 'white') }
                    { place_line(upper_x, upper_y, process_connect.id, process_connect.index, 'gray') }
                    <circle cx={upper_x} cy={upper_y} r={10} fill={source_color}
                      onClick={() => setTempUpper({isDisplayed: true, id: id, index: index})}
                    />
                  </g>
                )
              }
            }

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
        {
          target_debug === "" ?
          <rect x={data_fur.x} y={data_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaccaa" stroke='black' strokeWidth={5}
            onMouseEnter={() => {current_over_fur = id}}
            onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: data_fur.x, y: data_fur.y})} 
          /> :
          <rect x={data_fur.x} y={data_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#557755" stroke='black' strokeWidth={5}/>
        }
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
        {
          target_debug === "" ?
          <rect x={croom_fur.x} y={croom_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaaadd" stroke='black' strokeWidth={5}
            onMouseEnter={() => {current_over_fur = id}}
            onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: croom_fur.x, y: croom_fur.y})} 
          /> :
          <rect x={croom_fur.x} y={croom_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#555577" stroke='black' strokeWidth={5}/>
        }
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

  const place_debug_furs = () => {
    const fur_elements: JSX.Element[] = [];

    const debug = debugs.get(target_debug);
    if(debug === undefined) return null;

    // process furs
    debug.process_furs.forEach((process_fur, id) => {
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
                { place_line(upper_x, upper_y, source.id, source.index, 'gray') }
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
    debug.data_furs.forEach((data_fur, id) => {
      fur_elements.push(<g>
        <rect x={data_fur.x} y={data_fur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaccaa" stroke='black' strokeWidth={5}
          onMouseEnter={() => {current_over_fur = id}}
          onMouseDown={() => setTempFur({isDisplayed: true, id: id, x: data_fur.x, y: data_fur.y})} 
        />
        <text x={data_fur.x + fur_width / 2} y={data_fur.y + fur_height / 2} text-anchor="middle" dominant-baseline="central">
          {data_fur.path.split('-').pop()}
        </text>
        <circle cx={data_fur.x + fur_width / 2} cy={data_fur.y} r={10} />
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
            <button className='btn btn-secondary rounded-0 w-100' onClick={() => {
              if(target_debug === "") socket.emit("delete fur", path, current_over_fur);
              else socket.emit("delete debug fur", path, target_debug, current_over_fur);
              closeMenu();
            }}>削除</button>
          </div>
      }
    }
    return <></>
  }

  return (
    <>
      <header className='position-fixed w-100 bg-light d-flex p-1 border-bottom border-dark'>
        <button className='btn btn-primary m-1' onClick={() => window.open('/' + path + '/runroom')}>Run</button>
	    	<button className='btn btn-info m-1 me-3' onClick={() => socket.emit("save placement", path)}>Save</button>
        <button className={`tab ${target_debug === "" && 'active'}`} onClick={() => setTargetDebug("")}>Main</button>
        {
          Array.from(debugs.keys()).map(debug_name =>
            <button className={`tab ${target_debug === debug_name && 'active'}`} onClick={() => setTargetDebug(debug_name)}>{debug_name}</button>
          )
        }
        <button className='tab' onClick={() => socket.emit("create new debug", path, window.prompt("新たに作成するデバッグ名を入力してください"))}><h3 className='m-0'>+</h3></button>
      </header>
      <main>
        <svg className='mt-5' width={window.screen.width} height={window.screen.height} xmlns="http://www.w3.org/2000/svg"
          onContextMenu={(e) => {e.preventDefault(); setPopup({is_displayed: true, x: e.pageX, y: e.pageY});}}
        >
          <rect width={window.screen.width} height={window.screen.height} fill="white" onMouseEnter={() => {current_over_fur = ""}}></rect>
          {
            // outputの表示
            target_debug === "" &&
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
          { place_main_furs() }
          { place_debug_furs() }
          { 
            // Furnitureの移動にあたってダミーの表示
            tempFur.isDisplayed && 
            <rect x={tempFur.x} y={tempFur.y} width={fur_width} height={fur_height} rx="5" ry="5" fill="#aaaaaaaa"/>
          }
        </svg>
        { display_popup() }
      </main>
    </>
  );
}

export default EditPlacement;