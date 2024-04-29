import uvicorn

# from pyapp.modules.lzstring import LZString

if __name__ == "__main__":
    # lzstr = LZString()
    # str = lzstr.decompressFromUTF16(
    #     "᭣㰱Ōʆ̀⌠ᰠㅀ瘠堣⌠瘤ᠫ〴朸ƥ砬癀Ġԡ䬄׀ಀỪ䁎½䗓ǥ౪䷏Рގ࠽㣫㪭咶ừ侠僐渡ẳ␰瀥㩪䟨唠ὼ湜᪘ìನŘ⼳氥〣㄄ቐǑ䧓⠭䀠崠⾶᰺ܩ犑㯸瀨⒄Ⴚⴠᱱ䗂ጰ䭪昅ヺ┠㧏ப䕩ဨ䎑㖕窐F㇉峸䖃で奙偱䠾ݔ῀㡔ᜡອ䓡箱ⷈ彜ᄡ䳊䭯爨䈆䗤剒㤥ዖ晩埀ㆇ䂕䱍嚭㻧⟒෻渄䥻ᱠ㋢䣈བ°悲破⸲  "
    # )
    # print(str)
    uvicorn.run("pyapp:app", host="127.0.0.1", port=5000, log_level="debug")
    # app.run(debug=True)
