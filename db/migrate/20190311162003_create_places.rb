class CreatePlaces < ActiveRecord::Migration[5.2]
  def change
    create_table :places do |t|
      t.string :name
      t.string :address
      t.string :phone_number
      t.decimal :lng
      t.decimal :lat
      t.string :category
      t.decimal :rating
      t.integer :price
      t.string :photo
      t.string :reason
      t.string :google_url
      t.string :url
      t.references :city, foreign_key: true


      t.timestamps
    end
  end
end
