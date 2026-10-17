// Display only: the forecast's absolute end timestamp stays unchanged.
export function formatRemainingMinutes(minutes:number):string {
 const total=Math.max(0,Math.ceil(minutes)),hours=Math.floor(total/60),rest=total%60;
 return hours?`${hours} Std.${rest?` ${rest} Min.`:''}`:`${rest} Min.`;
}
