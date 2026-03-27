import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from flask import Flask, request, jsonify, send_file
import json

app = Flask(__name__)

# ===================== 配置区 =====================
# 基金代码列表
fund_codes = []

# 请求头（伪装浏览器）
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
# ==================================================

# 爬取单只基金净值
def crawl_fund_nav(fund_code):
    """爬取单只基金的名称、最新净值、更新时间"""
    try:
        url = f"https://fund.eastmoney.com/{fund_code}.html"
        # url = f"https://fund.10jqka.com.cn/{fund_code}"
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = "utf-8"
        soup = BeautifulSoup(response.text, "html.parser")

        # 提取基金名称
        fund_name_elem = soup.find("div", class_="fundDetail-tit")
        fund_name = fund_name_elem.get_text(strip=True).split("(")[0] if fund_name_elem else "未知名称"

        # 提取单位净值和更新时间
        data_item = soup.find("dl", class_="dataItem01")
        if not data_item:
            return {"code": fund_code, "name": fund_name, "nav": "-", "date": "-"}
        
        net_value = data_item.find("span", class_="ui-font-large").get_text(strip=True)
        date_text = data_item.find("dt").get_text(strip=True)
        net_date = ""
        for s in date_text.split():
            if "-" in s and len(s) >= 10:
                net_date = s.replace("单位净值", "").replace("(", "").replace(")", "").strip()
                break

        return {
            "code": fund_code,
            "name": fund_name,
            "nav": net_value,
            "date": net_date
        }
    except Exception as e:
        print(f"爬取{fund_code}失败：{str(e)}")
        return {"code": fund_code, "name": "爬取失败", "nav": "-", "date": "-"}

# 批量爬取所有基金
def crawl_all_funds():
    """爬取配置列表中的所有基金数据"""
    result = []
    for index, code in enumerate(fund_codes, 1):
        fund_data = crawl_fund_nav(code)
        result.append(fund_data)
        print(f"[{index}/{len(fund_codes)}] {code} | {fund_data['name']} | {fund_data['nav']} | {fund_data['date']}")
        time.sleep(0.5)  # 防反爬延迟
    return result

# ===================== 接口路由 =====================
@app.route('/api/fund/nav', methods=['GET'])
def get_fund_nav():
    """
    获取基金净值接口
    支持两种方式：
    1. 不传code：返回所有基金净值
    2. 传code：返回指定单只基金净值（例：/api/fund/nav?code=001402）
    """
    fund_code = request.args.get('code', '')
    if fund_code:
        # 查询单只基金
        data = crawl_fund_nav(fund_code)
        return jsonify({"status": "success", "data": data})
    else:
        # 查询所有基金
        data = crawl_all_funds()
        return jsonify({"status": "success", "data": data})

@app.route('/api/fund/export', methods=['GET'])
def export_fund_excel():
    """导出基金净值到Excel文件"""
    fund_data = crawl_all_funds()
    df = pd.DataFrame(fund_data)
    df.columns = ["基金代码", "基金名称", "最新净值", "更新时间"]
    excel_path = "基金净值数据.xlsx"
    df.to_excel(excel_path, index=False)
    return send_file(excel_path, as_attachment=True)

# 解决跨域问题（前端调用必备）
@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

if __name__ == '__main__':
    # 启动Flask服务，端口8080（可自行修改）
    print("基金净值服务启动中...")
    print("接口地址：http://127.0.0.1:8080/api/fund/nav")
    print("导出Excel：http://127.0.0.1:8080/api/fund/export")
    app.run(host='0.0.0.0', port=8080, debug=True)