import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import './style.css'

export type FileType = "type" | "data" | "process" | "room" | "directory"

type PopupType = "None" | "NewFile" | "DeleteFile"

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
	const navigate = useNavigate();

	const [is_room, setIsDir] = useState(false);
  const [files, setFiles] = useState(new Map([] as [string, FileType][]))

	const [temp_file_name, setTempFileName] = useState("");

	const [popup_type, setPopupType] = useState("None" as PopupType);

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

  const col_num = 4;

  const file_width = 200;
  const file_height = 150;

	const dir_width = file_width * (col_num * 1.5 + 0.5);
	const dir_height = 2000;

	return <>
		<header style={{minWidth: dir_width}} className={`${'directory_header'} ${is_room ? 'room_header' : ''}`}>
			{
				pre_dir_path &&
				<div style={{float: 'left'}}>
					<Link to={pre_dir_path} style={{
						color: 'lightblue',
					}}>
						上のディレクトリへ
					</Link>
				</div>
			}
			<button style={{float: 'left', marginLeft: 10}} onClick={() => { setPopupType("NewFile") }}>新規ファイル作成</button>
			{ dir_name }
			{
				is_room &&
				<>
					{ "(room)" }
					<a href={'/' + path + '/placement'} target="_blank" rel="noreferrer" style={{color: 'lightgreen', marginLeft: 10}}>
						edit placement
					</a>
				</>
			}
		</header>
    	<main className='directory_main' style={{width: dir_width, height: 2000}}>
    		{
        		Array.from(files).map(([file_name, file_type], index) => {
        			return <>
						<div className={`${file_type} ${'file'}`} style={{
							marginLeft: file_width / 2, marginTop: file_height / 2, width: file_width, height: file_height
						}} onClick={() => {
							switch(file_type) {
								case "type":
									window.open('/' + (path === '' ? '' : path + '-') + file_name + '/type');
									break;
								case "data":
									window.open('/' + (path === '' ? '' : path + '-') + file_name + '/data');
									break;
								case "process":
									window.open('/' + (path === '' ? '' : path + '-') + file_name + '/process');
									break;
								case "room":
									window.open('/' + (path === '' ? '' : path + '-') + file_name + '/placement');
									break;
								case "directory":
									window.open('/' + (path === '' ? '' : path + '-') + file_name);
							}
						}}>
							<div className="delete_button" style={{width: 20, height: 20, marginLeft: file_width - 25, borderRadius: 35}} onClick={(e) => {
								e.stopPropagation();
								setTempFileName(file_name);
								setPopupType("DeleteFile");
							}}/>
							{ file_name }
							{
								(file_type === 'room' || file_type == 'directory') &&
								<button className='open_button' style={{
									marginTop: file_height / 2, width: file_width,
								}} onClick={(e) => {
									e.stopPropagation();
									navigate('/' + (path === '' ? '' : path + '-') + file_name);
								}}>
									open
								</button>
							}
						</div>
					</>
        		})
    		}
			{
				// new file popup
				popup_type === "NewFile" &&
				<div className='popup' onMouseLeave={() => {
					setTempFileName("");
					setPopupType("None");
				}}>
					<input className='name_input' type="text" value={temp_file_name} onChange={(e) => setTempFileName(e.target.value)}/>
					<br/>
					{
						['data', 'process', 'room', 'directory', 'type'].map((new_type) => {
							return <button className={new_type} onClick={() => {
								socket.emit("create new file", path, temp_file_name, new_type);
								setTempFileName("");
								setPopupType("None");
							}}>new {new_type}</button>
						})
					}
				</div>
			}
			{
				// delete file popup
				popup_type === "DeleteFile" &&
				<div className='popup'>
					ファイル"{temp_file_name}"を本当に削除しますか?
					<br/>
					<button onClick={() => {
						socket.emit("delete file", path, temp_file_name);
						setTempFileName("");
						setPopupType("None");
					}}>
						はい
					</button>
					<button onClick={() => {
						setTempFileName("");
						setPopupType("None");
					}}>
						いいえ
					</button>
				</div>
			}
    	</main>
	</>
}