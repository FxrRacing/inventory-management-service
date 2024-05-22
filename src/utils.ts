import { Env } from "./interfaces";

export function createCard(message: string,storeName:string,fileName:string) {
    const batchUrl = `https://inventory-dashboard-kappa.vercel.app/inventory/${storeName}`
    const fileUrl =`https://hook-sub-service.tight-poetry-ac2d.workers.dev/files/${fileName}`
    const card = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": 'FF0000',
        "summary": "Inventory Manager Notification v3",
        "sections": [{
            "activityTitle": "Inventory Manager Notification",
            "activitySubtitle": message,
            "activityImage": "https://adaptivecards.io/content/cats/1.png",
            "facts": [{
                "name": "Store",
                "value": storeName
            }, ],
            "markdown": true
        }],
        "potentialAction": [{
            "@type": "OpenUri",
        "name": "View Error File",
        "targets": [{
            "os": "default",
            "uri": fileUrl
        }]
        }]
    };
    return card;
}


export function buildAdaptiveCard(subtitle:string, status:string, store:string, currency:string, bulkId:string, ettc:string = 'Unavailable at this time', StagedUrl:string, themeColor:string = 'd76100', additionalMessage?:string, timestamp?:string ){
	const card = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": themeColor,
        "summary": "Catalog and Pricing App action",
        "sections": [{
            "activityTitle": "Catalog and Pricing App action",
            "activitySubtitle": subtitle,
            "activityImage": "https://adaptivecards.io/content/cats/3.png",
            "facts": [{
                "name": "Timestamp",
                "value": timestamp|| new Date().toLocaleString()
            }, {
                "name": "Status",
                "value": status
            }, {
                "name": "Store",
                "value": store
            }, {
                "name": "Currency",
                "value": currency
            }, {
                "name": "Bulk Operation Id",
                "value": bulkId
            }, {
                "name": "ETTC (Estimated Time to Complete)",
                "value": ettc
            }],
            "markdown": true
        }],
        "potentialAction": [{
            "@type": "ActionCard",
            "name": "Add a comment",
            "inputs": [{
                "@type": "TextInput",
                "id": "comment",
                "isMultiline": false,
                "title": "Add a comment here for this task"
            }],
            "actions": [{
                "@type": "HttpPOST",
                "name": "Add comment",
                "target": "https://learn.microsoft.com/outlook/actionable-messages"
            }]
        }]
    };
	if (additionalMessage) {
		card.sections.push({
			"type": "TextBlock",
			"text": additionalMessage,
			"color": "accent",
			"wrap": true
		}as any);
	}

if (StagedUrl) {
	card.potentialAction.push({
		"@type": "OpenUri",
		"name": "View Staged Products",
		"targets": [{
			"os": "default",
			"uri": StagedUrl
		}]
	} as any); // Add 'as any' to bypass type checking
}

    return card;
}


export async function notifyTeams(message: string, env: Env) {
	const teamsWebhook =  env.TEAMS_URL;
	if (!teamsWebhook) {
		console.error('Teams webhook url not found in environment variables');
		return;
	}
	try {
        const response = await fetch(teamsWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: message 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Teams response:', data);
        console.log('Teams status:', response.status);
        return data;
    } catch (error) {
        console.error('An error occured while notifing the teams channel:', error);
        return error;
    }

}