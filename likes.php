<?php
$FILE = __DIR__ . '/likes.txt';
$action = $_SERVER['REQUEST_METHOD'] === 'POST' ? 'post' : ($_GET['action'] ?? '');

if($action === 'list'){
  if(!file_exists($FILE)) echo json_encode([]);
  else{
    $lines = array_filter(array_map('trim', file($FILE)));
    $out = [];
    foreach($lines as $ln){
      list($id,$count) = explode(',', $ln) + [null,0];
      if($id) $out[intval($id)] = intval($count);
    }
    header('Content-Type: application/json');
    echo json_encode($out);
  }
  exit;
}

if($_SERVER['REQUEST_METHOD'] === 'POST'){
  $body = json_decode(file_get_contents('php://input'),true);
  if(!isset($body['id'])){ http_response_code(400); echo json_encode(['error'=>'no id']); exit; }
  $id = intval($body['id']);
  $map = [];
  if(file_exists($FILE)){
    $lines = array_filter(array_map('trim', file($FILE)));
    foreach($lines as $ln){ list($k,$v) = explode(',',$ln) + [null,0]; if($k) $map[intval($k)] = intval($v); }
  }
  $map[$id] = ($map[$id] ?? 0) + 1;
  $out = [];
  foreach($map as $k=>$v) $out[] = $k.','.$v;
  file_put_contents($FILE, implode("\n", $out));
  header('Content-Type: application/json');
  echo json_encode(['id'=>$id,'count'=>$map[$id]]);
  exit;
}

http_response_code(405);
echo json_encode(['error'=>'unsupported']);
?>
