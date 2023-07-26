import XLSX from "xlsx";
import "./style.css";

type ItemResult = [
  time: string, 
  name: string, 
  type: string, 
  rank: string
];

const worksheetConfig = [
  {
    title: "角色活动祈愿",
    uigf_gacha_version: 301,
  },
  {
    title: "武器活动祈愿",
    uigf_gacha_version: 302,
  },
  {
    title: "新手祈愿",
    uigf_gacha_version: 100,
  },
  {
    title: "常驻祈愿",
    uigf_gacha_version: 200,
  },
]

async function convert() {
  const files = input.files;
  if (files === null || files.length !== 1) {
    return;
  }
  const file = files[0];
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsText(file);
  });
  const data = JSON.parse(text);
  const { info, list } = data;
  if (info.lang !== "zh-cn") {
    throw new Error(`不支持的语言：${info.lang}`);
  }
  if (!info.uigf_version.startsWith("v2")) {
    throw new Error(`不支持的 UIGF 版本：${info.uigf_version}`);
  }
  const result = new Map<number, ItemResult[]>();
  for (const item of list) {
    const { id, uigf_gacha_type, time } = item;
    const item_type: string | undefined = item.item_type;
    const rank_type: string | undefined = item.rank_type;
    let name: string;
    if (typeof item_type === "undefined" || typeof rank_type === "undefined") {
      throw new Error(`缺少 item_type 或 rank_type 字段；非小酋 Excel 格式需要它们，但 UIGF 中未提供。`);
    }
    if ("name" in item) {
      name = item.name;
    } else if ("item_id" in item && !Number.isNaN(Number(item.item_id))) {
      throw new Error(`UIGF 中未提供 name 字段，但是提供了 item_id。需要调用 UIGF-API；此功能尚未实现。`);
    } else {
      throw new Error(`UIGF 中未提供 name 字段，也未提供 item_id；这不符合 v2.2- 或 v2.3 的规定。`);
    }
    const page = Number(uigf_gacha_type);
    if (!result.has(page)) {
      result.set(page, []);
    }
    const items = result.get(page)!;
    items.push([time, name, item_type, rank_type]);
  }
  console.log(result);

  const book = XLSX.utils.book_new();
  for (const cfg of worksheetConfig) {
    const { title, uigf_gacha_version } = cfg;
    const page = uigf_gacha_version;
    const rows: ItemResult[] = [["时间", "名称", "类别", "星级"]];
    if (result.has(page)) {
      rows.push(...result.get(page)!);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(book, ws, title);
  }
  XLSX.writeFile(book, `output.xlsx`);
}

const input = document.querySelector("#fileInput")! as HTMLInputElement;

input.addEventListener("change", async () => {
  try {
    document.querySelector("#loading")?.classList.remove('hidden');
    await convert();
    document.querySelector("#finish")?.classList.remove('hidden');
  } catch (e) {
    alert(e);
  } finally {
    document.querySelector("#loading")?.classList.add('hidden');
  }
});