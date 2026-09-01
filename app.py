from flask import Flask, render_template, request
import re
app = Flask(__name__)

def mask_data(t):
    #number
    t  = re.sub(r'\b\d{4}-\d{4}-\d{4}-(\d{4})\b',r'XXXX-XXXX-XXXX-\1',t)
    t  = re.sub(r'\b\d{4}\d{4}\d{4}(\d{4})\b',r'XXXX-XXXX-XXXX-\1',t)
    #credit-card
    t = re.sub(r'\b\d{3}-\d{3}-(\d{4})\b',r'XXXX-XXX-\1',t)
    t = re.sub(r'\b\d{3}\d{3}(\d{4})\b',r'XXXX-XXX-\1',t)
    #gmail
    def mask_email(match):
        first_char = match.group(1)  
        middle_chars = match.group(2)  
        last_char = match.group(3)  
        domain = match.group(4)  
        masked_middle = '*' * len(middle_chars)

        return f'{first_char}{masked_middle}{last_char}@{domain}'

    pattern_email = r'\b([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]+)([a-zA-Z0-9._%+-])@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b'

    t = re.sub(pattern_email, mask_email, t)
    #date
    t = re.sub(r'DOB:\d{2}/\d{2}/(\d{2})\d{2}',r'XX/XX/\1XX',t)
    #address
    t = re.sub(r'(Address:\s*)[^\s]+', r'\1XXX', t)

    return t


@app.route("/")
def index():
    return render_template('index.html')

@app.route('/mask', methods = ['POST'])
def mask():
    original = request.form.get('data','')
    print(type(original))
    mask_text = mask_data(original)
    return render_template('index.html',original=original,mask_text=mask_text)

if __name__ == "__main__":
    app.run(debug=True)