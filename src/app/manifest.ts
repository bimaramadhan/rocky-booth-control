import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name:"Rocky Booth Control", short_name:"Rocky Control", description:"Operasional booth Rocky Rooster", start_url:"/", display:"standalone", background_color:"#fffaf0", theme_color:"#b42318", icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml"}] }; }
