// pages/api/relays/index.js
export default async function handler(req, res) {
  try {
    const response = await fetch("http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/relays");
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching relays:", error);
    res.status(500).json({ error: "Failed to fetch relays data" });
  }
}
