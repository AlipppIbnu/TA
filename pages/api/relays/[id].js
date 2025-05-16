// pages/api/relays/[id].js
export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method === 'PATCH') {
    try {
      const response = await fetch(
        `http://ec2-13-239-62-109.ap-southeast-2.compute.amazonaws.com/items/relays/${id}`, 
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(req.body),
        }
      );
      
      const data = await response.json();
      res.status(response.ok ? 200 : 400).json(data);
    } catch (error) {
      console.error("Error updating relay:", error);
      res.status(500).json({ error: "Failed to update relay" });
    }
  } else {
    res.setHeader('Allow', ['PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
