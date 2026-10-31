export function resultPresentation(match,duel=false){
 const won=match.gameWinner==='left',name=won?'玩家一':'玩家二',finished=!!match.winner;
 return {
  kicker:finished?'三局两胜 / 全场结算':`第 ${match.gameNumber} 局 / 本局结算`,
  title:finished?(duel?name+'夺冠':won?'大获全胜':'惜败收场'):(duel?name+'获胜':won?'我方获胜':'我方失败'),
  detail:`本局 ${match.left} : ${match.right} · 总局数 ${match.games.left} : ${match.games.right}`,
  history:match.history.map((g,i)=>`第${i+1}局 ${g.left}:${g.right}`).join(' / '),
  next:finished?'再战一场':`开始第 ${match.gameNumber+1} 局`
 };
}
