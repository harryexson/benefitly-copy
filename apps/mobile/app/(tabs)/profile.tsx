import { StyleSheet, Text, View } from "react-native";
export default function Profile(){return <View style={s.page}><Text style={s.title}>Your profile</Text><Text style={s.copy}>Sign in to manage your account, fundraisers and organization workspace.</Text></View>}
const s=StyleSheet.create({page:{padding:24,gap:16},title:{fontSize:34,fontWeight:'700',color:'#12233F'},copy:{fontSize:17,lineHeight:25,color:'#52627b'}});
