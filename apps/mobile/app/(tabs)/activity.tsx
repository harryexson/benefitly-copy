import { StyleSheet, Text, View } from "react-native";
export default function Activity(){return <View style={s.page}><Text style={s.title}>Activity</Text><Text style={s.copy}>Sign in to see campaign updates, donation receipts and organization activity.</Text></View>}
const s=StyleSheet.create({page:{padding:24,gap:16},title:{fontSize:34,fontWeight:'700',color:'#12233F'},copy:{fontSize:17,lineHeight:25,color:'#52627b'}});
