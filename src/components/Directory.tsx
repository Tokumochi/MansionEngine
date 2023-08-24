import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import './style.css'

export type FileType = "type" | "data" | "process" | "room" | "directory"

type Popup = 
  | {kind: "None"}
  | {kind: "EditFile", x: number, y: number, file_name: string}

const socket = io("http://127.0.0.1:8080");

export function PathDirectory() {
  const { path } = useParams();

	if(path === undefined) {
    console.log("not param");
    return <></>;
  }

	return <Directory path={path}/>
}

export function Directory(props: {path: string}) {
	const { path } = props;

	const [is_room, setIsDir] = useState(false);
  const [files, setFiles] = useState(new Map([] as [string, FileType][]))

	const [popup, setPopup] = useState({kind: "None"} as Popup);

  useEffect(() => {
    socket.on("update dir", (dir: {is_room: boolean, files: [string, FileType][]}) => { setIsDir(dir.is_room); setFiles(new Map(dir.files)); });
	}, []);

	useEffect(() => {
		socket.on("create new file", (new_name: string, new_type: FileType) => { setFiles(new Map(files.set(new_name, new_type))) });
		socket.on("delete file", (target_name: string) => {
			files.delete(target_name);
			setFiles(new Map(files));
		});
	}, [files]);

  useEffect(() => {
    socket.emit("join dir", path);
  }, [path])

	let dir_name: string | undefined = undefined;
	let pre_dir_path: string | undefined = undefined;
	if(path !== '') {
		const routes = path.split('-');
		dir_name = routes.pop();
		pre_dir_path = '/' + routes.join('-');
	}

	return <>
		<header className='border-bottom border-dark'>
			<div className='d-flex p-1'>
			  {
			  	pre_dir_path &&
			  	<Link className="btn btn-secondary me-4 p-2 fw-bold" to={pre_dir_path}>
			  		上のディレクトリへ
			  	</Link>
			  }
			  <button className='btn border border-dark rounded-0 bg-type p-1 m-1' onClick={() => socket.emit("create new file", path, window.prompt("新たに作成するタイプ名を入力してください"), "type")}>新規タイプ作成</button>
			  <button className='btn border border-dark rounded-0 bg-data p-1 m-1' onClick={() => socket.emit("create new file", path, window.prompt("新たに作成するデータ名を入力してください"), "data")}>新規データ作成</button>
			  <button className='btn border border-dark rounded-0 bg-process p-1 m-1' onClick={() => socket.emit("create new file", path, window.prompt("新たに作成するプロセス名を入力してください"), "process")}>新規プロセス作成</button>
			  <button className='btn border border-dark rounded-0 bg-room p-1 m-1' onClick={() => socket.emit("create new file", path, window.prompt("新たに作成するルーム名を入力してください"), "room")}>新規ルーム作成</button>
      </div>
      <div className='d-flex justify-content-center p-2'>
			  {
			  	is_room &&
			  	<>
			  		<h2 className='m-0 text-room'>{ dir_name }(room)</h2>
			  		<a className='btn bg-room ms-2 p-1' href={'/' + path + '/room'} target="_blank" rel="noreferrer">
			  			<h5 className='p-1 m-0 fw-bolder'>編集</h5>
			  		</a>
			  	</>
			  }
        {
			  	!is_room &&
          <h2 className='m-0 text-directory'>{ dir_name }</h2>
        }
      </div>
		</header>
    <main>
      <div className="container d-flex justify-content-start flex-wrap">
    	{
      	Array.from(files).map(([file_name, file_type], index) => {
      		return <div className="col-lg-3 col-md-4 col-6 mt-5">
				    <a className={`${"btn border border-dark border-5 rounded-4 ratio ratio-4x3"} ${'bg-' + file_type}`}
              target="_blank" href={'/' + (path === '' ? '' : path + '-') + file_name + (file_type === "directory" ? "" : '/' + file_type)}
              onContextMenu={(e) => {e.preventDefault(); setPopup({kind: "EditFile", x: e.pageX, y: e.pageY, file_name: file_name});}} 
				    >
              <div className='d-flex flex-column justify-content-center align-items-center'>
                <h4 className='w-100 m-0 text-center text-wrap mt-4 mb-4'>
				    	    { file_name.replaceAll('_', ' ') }
                </h4>
                {
                  (file_type === "room" || file_type === "directory") &&
                  <Link className="btn btn-secondary border border-dark border-3 w-50 p-1" to={'/' + (path === '' ? '' : path + '-') + file_name}>
                      <h5 className='m-0 fw-bold'>開く</h5>
                  </Link>
                }
              </div>
				    </a>
				  </div>
      	})
    	}
		  {
		  	// edit file popup
		  	popup.kind === "EditFile" &&
		  	<div className='position-absolute border border-dark bg-light' style={{left: popup.x - 30, top: popup.y - 20}} onMouseLeave={() => setPopup({kind: "None"})}>
          <button className='btn btn-secondary rounded-0 w-100' onClick={() => {
            const file_name = popup.file_name;
            setPopup({kind: "None"});
            if(confirm(file_name + "を本当に削除しますか?")) socket.emit("delete file", path, file_name);
          }}>削除</button>
		  	</div>
		  }
      </div>
    </main>
	</>
}