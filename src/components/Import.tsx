import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

import { FileType } from './Directory';

import './style.css'

const socket = io("http://127.0.0.1:8080");

function Import(props: {
	path: string,
	width: number, 
	height: number,
	clickType: (type_path: string) => void,
	clickData: (data_path: string) => void,
	clickProcess: (process_path: string) => void,
	clickRoom: (croom_path: string) => void,
}) {
	const {width, height, clickType, clickData, clickProcess, clickRoom} = props;

	const [is_room, setIsDir] = useState(false);
	const [files, setFiles] = useState(new Map([] as [string, FileType][]))

	const [path, setPath] = useState(props.path);

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
		pre_dir_path = routes.join('-');
	}

	const col_num = 4;

	const file_width = 100;
	const file_height = 75;

	const dir_width = file_width * (col_num * 1.5 + 0.5);
	const dir_height = 2000;

	return <div style={{width: width, height: height}}>
		<header style={{width: dir_width}} className={`${'new_fur_menu_header'} ${is_room ? 'room_header' : ''}`}>
			{
				(pre_dir_path || pre_dir_path === '') &&
				<div style={{float: 'left'}}>
					<div style={{color: 'lightblue'}} onClick={() => {
						if(pre_dir_path === undefined) {
							console.log("What's happening!?");
							return;
						}
						setPath(pre_dir_path);
					}}>
						上のディレクトリへ
					</div>
				</div>
			}
			{ dir_name }
			{
				is_room && "(room)"
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
									clickType(path + '-' + file_name);
									break;
								case "data":
									clickData(path + '-' + file_name);
									break;
								case "process":
									clickProcess(path + '-' + file_name);
									break;
								case "room":
									clickRoom(path + '-' + file_name);
							}
						}}>
							{ file_name }
							{
								(file_type === 'room' || file_type === 'directory') &&
								<button className='open_button' style={{
									marginTop: file_height / 3, width: file_width,
								}} onClick={(e) => {
									e.stopPropagation();
									setPath((path === '' ? '' : path + '-') + file_name);
								}}>
									open
								</button>
							}
						</div>
					</>
       			})
    		}
    </main>
  </div>
}

export default Import;